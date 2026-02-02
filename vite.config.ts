import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy API requests to backend - this allows cookies to work
          '/api': {
            target: 'http://localhost:5001',
            changeOrigin: true,
            secure: false,
            // Preserve cookies
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // Forward cookies from browser
                if (req.headers.cookie) {
                  proxyReq.setHeader('Cookie', req.headers.cookie);
                }
              });
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Use relative URL when proxy is configured
        'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
