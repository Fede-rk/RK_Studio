import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        filmlab: resolve(__dirname, 'filmlab/index.html'),
        comparador: resolve(__dirname, 'comparador/index.html'),
      },
    },
  },
});