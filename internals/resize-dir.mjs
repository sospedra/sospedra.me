import resize from './resize.mjs'
import createScript from './create-script.mjs'

await createScript('resize', (file) => {
  if (/\.(gif|jpg|jpeg|tiff|png)$/i.test(file)) return resize(file)
})()
