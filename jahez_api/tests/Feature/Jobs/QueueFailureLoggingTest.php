<?php

use Illuminate\Contracts\Queue\Job;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Log;

// Finding PA-18: a job that failed for good (an invitation or a reset email that never
// left) was visible only by reading failed_jobs by hand. It now writes an error log line
// for the container log / alerting, naming the job but never its payload or the
// exception message (both can carry addresses or tokens).
it('logs a failed job at error level without its payload', function () {
    $job = Mockery::mock(Job::class);
    $job->shouldReceive('resolveName')->andReturn('App\\Jobs\\SendPasswordResetLink');
    $job->shouldReceive('getQueue')->andReturn('default');
    $job->shouldNotReceive('payload', 'getRawBody');

    Log::shouldReceive('error')->once()->withArgs(function (string $message, array $context): bool {
        return $message === 'Queued job failed'
            && $context === [
                'job' => 'App\\Jobs\\SendPasswordResetLink',
                'connection' => 'database',
                'queue' => 'default',
                'exception' => RuntimeException::class,
            ];
    });

    event(new JobFailed('database', $job, new RuntimeException('550 mailbox user@example.test unavailable')));
});
