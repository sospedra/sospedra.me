export type PaperImageSize = {
  width: number
  height: number
}

export type Paper = {
  createdAt: string
  excerpt: string
  minutes: number
  og: string
  slug: string
  title: string
  updatedAt: string
  categories: string[]
  images: Record<string, PaperImageSize | undefined>
}
