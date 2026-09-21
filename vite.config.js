import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        filmlab: resolve(import.meta.dirname, 'filmlab/index.html'),
        comparador: resolve(import.meta.dirname, 'comparador/index.html'),
      },
    },
  },
});