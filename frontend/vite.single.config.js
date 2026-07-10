import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite config specifically for single-file local protocol (file://) compatibility
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
