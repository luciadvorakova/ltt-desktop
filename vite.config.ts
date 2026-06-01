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
        vite: {
          define: {
            'process.env.JIRA_CLIENT_SECRET': JSON.stringify(process.env.JIRA_CLIENT_SECRET),
            'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID),
            'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.GOOGLE_CLIENT_SECRET),
            'process.env.LTT_PROXY_SECRET': JSON.stringify(process.env.LTT_PROXY_SECRET),
          },
          build: {
            rollupOptions: {
              external: ['ws', 'bufferutil', 'utf-8-validate'],
            },
          },
        },
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
