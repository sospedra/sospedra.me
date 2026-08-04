import rewrites from 'services/rewrites.json'

type Rewrite = (typeof rewrites)[number]

export const publicRewrites = rewrites.filter(
  (rewrite): rewrite is Extract<Rewrite, { title: string }> =>
    Boolean(rewrite.listed),
)
