import * as z from 'zod/mini'
import type { Paper } from './paper.types.ts'

export class PaperMetadataError extends Error {
  readonly slug: string
  readonly field: string

  constructor(slug: string, field: string) {
    super(`paper ${slug}: invalid metadata field "${field}"`)
    this.name = 'PaperMetadataError'
    this.slug = slug
    this.field = field
  }
}

const isoDate = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}/))
const nonEmpty = z.string().check(z.minLength(1))
const imageSize = z.object({ width: z.number(), height: z.number() })

// shape order decides which field a multi-fault metadata names first
const metadataSchema = z.object({
  minutes: z.number(),
  categories: z.array(z.string()),
  createdAt: isoDate,
  description: z.nullish(nonEmpty),
  excerpt: nonEmpty,
  og: nonEmpty,
  title: nonEmpty,
  updatedAt: isoDate,
  images: z.nullish(z.record(z.string(), imageSize)),
})

export const paperFromMetadata = (slug: string, value: unknown): Paper => {
  const result = metadataSchema.safeParse(value)
  if (!result.success) {
    const [issue] = result.error.issues
    throw new PaperMetadataError(slug, String(issue?.path[0] ?? 'metadata'))
  }
  const { images, description, ...fields } = result.data
  return {
    ...fields,
    slug,
    images: images ?? {},
    description: description ?? undefined,
  }
}

export const byNewestFirst = (left: Paper, right: Paper): number =>
  right.createdAt.localeCompare(left.createdAt)
