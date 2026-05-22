import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/openai': {
        target: 'https://opencode.ai/zen',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/openai/, ''),
      },
    },
  },
});
