import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,        // Forces this app to run on 5174
    strictPort: true,  // Tells Vite to crash if 5174 is busy, rather than guessing a new port
  }
})
