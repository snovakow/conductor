import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from whatever folder it is served from
  base: '',
  build: {
    // three.js and React Three Fiber make one chunk of about 1.2 MB; it's one scene, so it isn't split
    chunkSizeWarningLimit: 1500,
  },
})
