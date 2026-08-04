import reading from './scripts/reading.mts'
import resize from './scripts/resize.mts'

export default {
  '*.{ts,tsx,css,json}': 'biome check --write --no-errors-on-unmatched',
  '*.mdx': (filenames) => {
    for (const filename of filenames) {
      reading(filename)
    }
    return []
  },
  '*.{gif,jpg,jpeg,tiff,png}': (filenames) => {
    for (const filename of filenames) {
      resize(filename)
    }
    return []
  },
}
