import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/travel/sedona-2026/',
  plugins: [react(), tailwindcss()],
  build: { target: 'safari16', sourcemap: true },
});
