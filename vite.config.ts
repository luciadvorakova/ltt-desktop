import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://electron-vite.org
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: 'src/main/index.ts',
      },
      {
        // Preload script entry
        entry: 'src/preload/preload.ts',
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
})
