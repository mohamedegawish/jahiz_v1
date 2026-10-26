import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// The production Content-Security-Policy (docker/csp.txt, applied by nginx). `vite preview`
// sends the same policy, so a built bundle can be checked against it locally. A same-origin
// base URL (/api/v1) is covered by 'self', so the API origin placeholder is then dropped.
const contentSecurityPolicy = (apiBaseUrl: string | undefined): string => {
  const apiOrigin = apiBaseUrl && /^https?:\/\//.test(apiBaseUrl) ? ` ${new URL(apiBaseUrl).origin}` : ''
  return readFileSync(path.resolve(__dirname, 'docker/csp.txt'), 'utf8').trim().replaceAll(' __API_ORIGIN__', apiOrigin)
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // The API allow-lists this exact origin in CORS_ALLOWED_ORIGINS (and FRONTEND_URL points here),
    // so the dev server must not drift to another port.
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
    headers: {
      'Content-Security-Policy': contentSecurityPolicy(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL),
    },
  },
}))
