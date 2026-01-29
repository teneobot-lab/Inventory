
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Prevent libraries checking for process.env from crashing
      'process.env': {} 
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://159.223.57.240:3010',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
