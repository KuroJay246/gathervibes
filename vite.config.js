import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'firebase-firestore'
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) return 'firebase-auth'
            return 'firebase-core'
          }
          if (id.includes('node_modules/lucide-react')) return 'icons'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor'
        },
      },
    },
  },
})
