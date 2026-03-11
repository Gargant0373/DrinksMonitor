import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sessions': 'http://localhost:5000',
      '/participants': 'http://localhost:5000',
      '/drink': 'http://localhost:5000',
      '/users': 'http://localhost:5000',
    },
  },
})
