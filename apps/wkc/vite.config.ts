import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { type Connect, defineConfig, type Plugin } from 'vite'

const serveCodesCleanUrl: Connect.NextHandleFunction = (req, _res, next) => {
  if (req.url === '/codes') req.url = '/codes.html'
  next()
}

const cleanUrls = (): Plugin => ({
  name: 'clean-urls',
  configureServer: (server) => {
    server.middlewares.use(serveCodesCleanUrl)
  },
  configurePreviewServer: (server) => {
    server.middlewares.use(serveCodesCleanUrl)
  },
})

export default defineConfig({
  plugins: [tailwindcss(), cleanUrls()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        codes: fileURLToPath(new URL('codes.html', import.meta.url)),
        index: fileURLToPath(new URL('index.html', import.meta.url)),
      },
    },
  },
})
