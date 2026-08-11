import totalEclipse from 'repo/papers/total-eclipse/i18n.ts'
import type { PaperLocale } from './paper.locales.ts'
import type { PaperTranslation } from './paper.types.ts'

/** Static map, so every MDX translation lands in its own build-time chunk. */
const REGISTRY: Record<
  string,
  Partial<Record<PaperLocale, PaperTranslation>>
> = {
  'total-eclipse': totalEclipse,
}

export const translationOf = (
  slug: string,
  locale: PaperLocale,
): PaperTranslation | null => REGISTRY[slug]?.[locale] ?? null
