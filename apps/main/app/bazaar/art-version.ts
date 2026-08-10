/* next.config.ts hashes public/images/bazaar into this token; a ?v= URL
   earns the year-immutable header and moves when the bytes move.
   postcss.config.mjs stamps the same token on the CSS url() refs. */
const version = process.env.NEXT_PUBLIC_BAZAAR_ART_V ?? 'dev'

export const artSrc = (path: string) => `${path}?v=${version}`

/** for url("...png") values persisted in decor.json chrome patches */
export const artCssUrl = (value: string) =>
  value.includes('?v=')
    ? value
    : value.replaceAll('.png"', `.png?v=${version}"`)
