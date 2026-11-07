import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/admin': {
          target: apiTarget,
          changeOrigin: true,
          // Page loads share this prefix with the API; let Vite serve the SPA.
          bypass(request) {
            if (request.method === 'GET' && request.headers.accept?.includes('text/html')) return '/index.html'
          },
        },
        '/business-info': { target: apiTarget, changeOrigin: true },
        '^/event(?:/|$|\\?)': { target: apiTarget, changeOrigin: true },
        '/message': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
