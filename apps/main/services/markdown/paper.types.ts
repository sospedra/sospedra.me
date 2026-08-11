import type { MDXContent } from 'mdx/types'

export type PaperImageSize = {
  width: number
  height: number
}

export type Paper = {
  createdAt: string
  description?: string
  excerpt: string
  minutes: number
  og: string
  slug: string
  title: string
  updatedAt: string
  categories: string[]
  images: Record<string, PaperImageSize | undefined>
}

export type PaperTranslation = {
  title: string
  description: string
  excerpt: string
  keywords: string[]
  load: () => Promise<{ default: MDXContent }>
}
