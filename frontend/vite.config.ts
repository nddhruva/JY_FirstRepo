import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1', '.cursorvm.com', '.cursor.sh', '.cursor.com'],
  },
})
