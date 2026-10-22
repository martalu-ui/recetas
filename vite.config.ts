import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: la app usa rutas con # y así funciona en cualquier subcarpeta (p. ej. GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      // Dos páginas: la app y el sistema de diseño (que usa los mismos componentes y estilos)
      input: { app: 'index.html', sistema: 'sistema.html' },
    },
  },
});
