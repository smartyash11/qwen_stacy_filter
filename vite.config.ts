import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // COOP is kept so opener isolation is maintained,
      // but COEP is intentionally omitted – require-corp blocks
      // MediaPipe WASM loading from CDN and can interfere with
      // the camera feed rendering in some browsers.
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})

