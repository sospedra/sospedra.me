import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2022',
    // lightningcss rejects the malformed `@media (not(hover))` block shipped in 98.css
    cssMinify: 'esbuild',
  },
})
