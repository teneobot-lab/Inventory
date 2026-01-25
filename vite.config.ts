import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    // Proxy configuration for local development
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3010', // Local backend
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});