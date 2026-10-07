import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' lets the app work on GitHub Pages (datexts.github.io/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: './',
})
