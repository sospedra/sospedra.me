import rewrites from './rewrites.json'

export const publicRewrites = rewrites.filter(({ listed }) => listed)
