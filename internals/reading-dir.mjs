import reading from './reading.mjs'
import createScript from './create-script.mjs'

await createScript('reading', (file) => {
  if (file.endsWith('.mdx')) return reading(file)
})()
