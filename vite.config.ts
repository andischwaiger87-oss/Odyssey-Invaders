import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser', // Maximale Kompression für schnelle Edge-Ladezeiten
  },
  server: {
    port: 3000,
    open: true
  }
});