/// <reference types="vite/client" />

declare module '*.css'

declare module 'human-number' {
  const humanNumber: (n: number, locale?: string) => string
  export default humanNumber
}

declare module 'language-map' {
  const languages: {
    [name: string]:
      | {
          type: 'data' | 'programming' | 'markup' | undefined
          aliases: string[]
          filenames: string[]
          extensions: string[]
          interpreters: string[]
          wrap: boolean
          color: string
          group: string
          aceMode: string
          searchable: string
          searchTerm: string
          languageId: number
        }
      | undefined
  }
  export default languages
}
