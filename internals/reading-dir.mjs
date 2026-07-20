import createScript from './create-script.mjs'
import reading from './reading.mjs'

await createScript('reading', (file) => {
  if (file.endsWith('.mdx')) return reading(file)
})()
