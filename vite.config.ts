import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Nutzt den ultraschnellen, nativ eingebauten SOTA-Minifier
  },
  server: {
    port: 3000,
    open: true
  }
});