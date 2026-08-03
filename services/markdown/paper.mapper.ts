import type { Paper, PaperImageSize } from './paper.types.ts'

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

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isImageSize = (value: unknown): value is PaperImageSize =>
  isRecord(value) &&
  typeof value.width === 'number' &&
  Number.isFinite(value.width) &&
  typeof value.height === 'number' &&
  Number.isFinite(value.height)

const stringField = (
  slug: string,
  meta: Record<string, unknown>,
  field: string,
): string => {
  const value = meta[field]
  if (typeof value !== 'string' || value.length === 0) {
    throw new PaperMetadataError(slug, field)
  }
  return value
}

const dateField = (
  slug: string,
  meta: Record<string, unknown>,
  field: string,
): string => {
  const value = stringField(slug, meta, field)
  if (!ISO_DATE_TIME.test(value)) throw new PaperMetadataError(slug, field)
  return value
}

const imagesField = (
  slug: string,
  meta: Record<string, unknown>,
): Record<string, PaperImageSize> => {
  const value = meta.images ?? {}
  if (!isRecord(value)) throw new PaperMetadataError(slug, 'images')
  const entries = Object.entries(value)
  if (!entries.every(([, size]) => isImageSize(size))) {
    throw new PaperMetadataError(slug, 'images')
  }
  return Object.fromEntries(entries) as Record<string, PaperImageSize>
}

export const paperFromMetadata = (slug: string, value: unknown): Paper => {
  if (!isRecord(value)) throw new PaperMetadataError(slug, 'metadata')

  const minutes = value.minutes
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    throw new PaperMetadataError(slug, 'minutes')
  }
  const categories = value.categories
  if (
    !Array.isArray(categories) ||
    !categories.every((category) => typeof category === 'string')
  ) {
    throw new PaperMetadataError(slug, 'categories')
  }

  return {
    createdAt: dateField(slug, value, 'createdAt'),
    excerpt: stringField(slug, value, 'excerpt'),
    minutes,
    og: stringField(slug, value, 'og'),
    slug,
    title: stringField(slug, value, 'title'),
    updatedAt: dateField(slug, value, 'updatedAt'),
    categories,
    images: imagesField(slug, value),
  }
}

export const byNewestFirst = (left: Paper, right: Paper): number =>
  right.createdAt.localeCompare(left.createdAt)
