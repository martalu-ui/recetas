import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: la app usa rutas con # y así funciona en cualquier subcarpeta (p. ej. GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
});
