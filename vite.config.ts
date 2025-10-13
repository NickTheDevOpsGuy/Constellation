import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

let tailwindPlugin: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tailwindPlugin = require('@tailwindcss/vite').default();
} catch {}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/app/components'),
      '@hooks': path.resolve(__dirname, './src/app/hooks'),
      '@lib': path.resolve(__dirname, './src/app/lib'),
      '@types': path.resolve(__dirname, './src/app/types'),
    },
  },
  build: {
    cssCodeSplit: false, // combine all CSS into one file
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // disables code splitting
        manualChunks: undefined, // no vendor/app separation
      },
    },
  },
});
