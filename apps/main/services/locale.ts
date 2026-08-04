'use client'

import { useEffect } from 'react'

export const useDocumentLang = (locale: string) => {
  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = locale
    return () => {
      if (document.documentElement.lang === locale) {
        document.documentElement.lang = previous
      }
    }
  }, [locale])
}
