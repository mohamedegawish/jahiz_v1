# =============================================================================
# run.ps1 - Jahez project launcher (API :8000 + queue worker + frontend :3000)
# Usage:
#   .\run.ps1            set up (dependencies, migrate, every seeder) then start everything
#   .\run.ps1 -SkipSetup start without the setup step
#   .\run.ps1 -Stop      stop everything this script started
#   .\run.ps1 -Status    show status of DB / API / frontend
# =============================================================================

param(
    [switch]$Stop,
    [switch]$Status,
    [switch]$SkipSetup
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = $PSScriptRoot
$ApiDir      = Join-Path $ProjectRoot 'jahez_api'
$FrontDir    = Join-Path $ProjectRoot 'front'

# --- environment (same paths used to bring the project up) ------------------
# PHP resolution: prefer local XAMPP PHP 8.2, then the original WinGet path, then PATH
$PhpCandidates = @(
    'C:\xampp\php\php.exe',
    'C:\Users\Sama Osama\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
)
$PHP = $PhpCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $PHP) { $PHP = (Get-Command php -ErrorAction SilentlyContinue).Source }
$ComposerPhar = 'C:\Users\LapShop\AppData\Roaming\Composer\latest.phar'
$Mysqld  = 'C:\xampp\mysql\bin\mysqld.exe'
$Mysql   = 'C:\xampp\mysql\bin\mysql.exe'
$DBPort  = 3306        # MySQL 8.4 (MySQL84 service) on this machine; if down, MariaDB fallback below tries 3306 too
$ApiPort = 8000
$FrPort  = 3000

$ApiLog = Join-Path $env:TEMP 'jahez_api.log'
$QLog   = Join-Path $env:TEMP 'jahez_queue.log'
$ViteLog= Join-Path $env:TEMP 'jahez_vite.log'
$PidFile= Join-Path $env:TEMP 'jahez_pids.json'

function Test-Port([int]$Port) {
    # IPv4 loopback, then IPv6 loopback (Vite listens on ::1 only)
    foreach ($addr in @(@('127.0.0.1', [System.Net.Sockets.AddressFamily]::InterNetwork),
                        @('::1',        [System.Net.Sockets.AddressFamily]::InterNetworkV6))) {
        try {
            $c = New-Object System.Net.Sockets.TcpClient($addr[1])
            $c.Connect($addr[0], $Port); $c.Close(); return $true
        } catch { }
    }
    return $false
}

function Get-AlivePids {
    if (Test-Path $PidFile) {
        $pids = @()
        try { $pids = (Get-Content $PidFile -Raw | ConvertFrom-Json).pids } catch { }
        return @($pids | Where-Object { $_ -and (Get-Process -Id $_ -ErrorAction SilentlyContinue) })
    }
    return @()
}

# ---------------------------------------------------------------- STATUS -----
if ($Status) {
    "DB     :$DBPort  " + $(if (Test-Port $DBPort) { 'UP' } else { 'DOWN' })
    "API    :8000  " + $(if (Test-Port $ApiPort) { 'UP' } else { 'DOWN' })
    "FRONT  :3000  " + $(if (Test-Port $FrPort)  { 'UP' } else { 'DOWN' })
    if (Test-Port $ApiPort) {
        try { "health : " + (Invoke-WebRequest "http://localhost:$ApiPort/api/v1/health" -UseBasicParsing -TimeoutSec 5).Content }
        catch { "health : FAIL ($($_.Exception.Message))" }
    }
    $tracked = Get-AlivePids
    "tracked pids : $($tracked -join ', ')  ($($tracked.Count) alive)"
    return
}

# ------------------------------------------------------------------ STOP -----
if ($Stop) {
    foreach ($p in Get-AlivePids) {
        try { Stop-Process -Id $p -Force -ErrorAction Stop; "stopped pid $p" } catch { }
    }
    # anything else launched from this project tree (vite/npm) or by this PHP (artisan/queue)
    Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='php.exe' OR Name='cmd.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -like "*$ProjectRoot*" -or
            ($_.Name -eq 'php.exe' -and ($_.CommandLine -like '*artisan serve*' -or $_.CommandLine -like '*queue:work*')) -or
            ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like '*jahez_vite.log*')
        } |
        ForEach-Object {
            try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; "stopped pid $($_.ProcessId) ($($_.Name))" } catch { }
        }
    Remove-Item $PidFile -ErrorAction SilentlyContinue
    "Jahez stopped."
    return
}

# ------------------------------------------------------------------ START -----
if (-not (Test-Path $PHP))     { throw "PHP not found: $PHP" }
if (-not (Test-Path $Mysqld))  { throw "MariaDB not found: $Mysqld" }
if (-not (Test-Path $ApiDir))  { throw "API dir missing: $ApiDir" }
if (-not (Test-Path $FrontDir)){ throw "front dir missing: $FrontDir" }

$trackedPids = @()

# 1) database: this machine runs MySQL 8.4 (MySQL84 service) on 3306 with `jahez` + `jahez_testing` already created.
# Never auto-start a second server on 3306 (datadir/port clash). Only the legacy 3307 MariaDB fallback auto-starts.
if (-not (Test-Port $DBPort)) {
    if ($DBPort -eq 3307) {
        Write-Host "starting MariaDB on :$DBPort ..."
        Start-Process -FilePath $Mysqld -ArgumentList "--port=$DBPort" -WindowStyle Hidden
        $deadline = (Get-Date).AddSeconds(30)
        while (-not (Test-Port $DBPort) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
        if (-not (Test-Port $DBPort)) { throw "MariaDB did not come up on :$DBPort" }
    } else {
        throw "No database listening on :$DBPort (expected MySQL84 service). Start it via services.msc, then re-run."
    }
} else { Write-Host "Database already up on :$DBPort" }

# 2) setup: dependencies on the first run, then the schema and every seeder. Each step is
# idempotent, so it runs on every start. With APP_ENV=local, db:seed also creates the local
# demo accounts, and DemoDataSeeder the full demo data set (ADR-024).
function Invoke-Step([string]$Name, [string]$Dir, [scriptblock]$Command) {
    Write-Host "setup: $Name ..."
    Push-Location $Dir
    try { & $Command } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "setup step failed: $Name (exit $LASTEXITCODE)" }
}

if (-not $SkipSetup) {
    if (-not (Test-Path (Join-Path $ApiDir 'vendor'))) {
        Invoke-Step 'composer install' $ApiDir { & composer install --no-interaction }
    }
    if (-not (Test-Path (Join-Path $FrontDir 'node_modules'))) {
        Invoke-Step 'npm install' $FrontDir { & npm install }
    }
    Invoke-Step 'migrate'             $ApiDir { & $PHP artisan migrate --force }
    Invoke-Step 'seed reference data' $ApiDir { & $PHP artisan db:seed --force }
    Invoke-Step 'seed demo data'      $ApiDir { & $PHP artisan db:seed --class=DemoDataSeeder --force }
}

# 3) Laravel API
if (-not (Test-Port $ApiPort)) {
    Write-Host "starting API on :$ApiPort ..."
    Start-Process -FilePath $PHP -ArgumentList 'artisan','serve','--host=127.0.0.1',"--port=$ApiPort" `
        -WorkingDirectory $ApiDir -WindowStyle Hidden -RedirectStandardOutput $ApiLog -RedirectStandardError "$ApiLog.err"
    $trackedPids += (Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
        Where-Object { $_.CommandLine -like '*artisan serve*' } | Select-Object -First 1 -ExpandProperty ProcessId)
    $deadline = (Get-Date).AddSeconds(30)
    while (-not (Test-Port $ApiPort) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
} else { Write-Host "API already up on :$ApiPort" }

# 4) queue worker (sends invitation / password-reset emails)
if (-not (Get-CimInstance Win32_Process -Filter "Name='php.exe'" | Where-Object { $_.CommandLine -like '*queue:work*' })) {
    Write-Host "starting queue worker ..."
    Start-Process -FilePath $PHP -ArgumentList 'artisan','queue:work','--tries=3' `
        -WorkingDirectory $ApiDir -WindowStyle Hidden -RedirectStandardOutput $QLog -RedirectStandardError "$QLog.err"
    $trackedPids += (Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
        Where-Object { $_.CommandLine -like '*queue:work*' } | Select-Object -First 1 -ExpandProperty ProcessId)
} else { Write-Host "queue worker already running" }

# 5) frontend (Vite; config is strictPort=3000)
if (-not (Test-Port $FrPort)) {
    Write-Host "starting frontend on :$FrPort ..."
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev > "%TEMP%\jahez_vite.log" 2>&1' `
        -WorkingDirectory $FrontDir -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(60)
    while (-not (Test-Port $FrPort) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
    if (-not (Test-Port $FrPort)) { throw "frontend did not come up on :$FrPort (see $ViteLog)" }
} else { Write-Host "frontend already up on :$FrPort" }

# record every process this launcher is responsible for (started now or already up)
$trackedPids = @()
$trackedPids += Get-CimInstance Win32_Process -Filter "Name='php.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*artisan serve*' -or $_.CommandLine -like '*queue:work*' } |
    ForEach-Object ProcessId
$trackedPids += Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$ProjectRoot*" -or $_.CommandLine -like '*jahez_vite.log*' } |
    ForEach-Object ProcessId
@{ pids = @($trackedPids | Where-Object { $_ }) } | ConvertTo-Json | Set-Content $PidFile

# 6) verify
Start-Sleep -Seconds 2
$health = $null
try { $health = (Invoke-WebRequest "http://localhost:$ApiPort/api/v1/health" -UseBasicParsing -TimeoutSec 10).Content } catch { }
$front = $null
try { $front = (Invoke-WebRequest "http://localhost:$FrPort" -UseBasicParsing -TimeoutSec 15).StatusCode } catch { }

Write-Host ""
Write-Host "================ JAEZ RUNNING ================"
Write-Host "API    http://localhost:$ApiPort  ->  $health"
Write-Host "FRONT  http://localhost:$FrPort   ->  HTTP $front"
Write-Host "Logs   $ApiLog | $QLog | $ViteLog"
Write-Host "Stop   .\run.ps1 -Stop      Status   .\run.ps1 -Status"
Write-Host "==============================================="
if (-not $health -or $front -ne 200) { exit 1 }
