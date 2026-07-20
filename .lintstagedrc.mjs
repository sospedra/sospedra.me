import resize from './internals/resize.mjs'
import reading from './internals/reading.mjs'

export default {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.css': 'prettier --write',
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
