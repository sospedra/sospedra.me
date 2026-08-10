import { bazaarArtVersion } from './scripts/bazaar-art-version.mjs'

const version = bazaarArtVersion()

/* stamps the art token on bazaar url() refs so CSS and code agree on
   one immutable URL per file; app/bazaar/art-version.ts is the code side */
const bazaarArtUrls = {
  postcssPlugin: 'bazaar-art-version',
  Declaration(decl) {
    const stampable =
      decl.value.includes('/images/bazaar/') && !decl.value.includes('?v=')
    if (!stampable) return
    decl.value = decl.value.replaceAll('.png"', `.png?v=${version}"`)
  },
}

export default { plugins: ['@tailwindcss/postcss', bazaarArtUrls] }
