const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const RANDOM_ARTICLE_QUERY = new URLSearchParams({
  action: 'query',
  generator: 'random',
  grnnamespace: '0',
  prop: 'extracts',
  exchars: '500',
  explaintext: '1',
  format: 'json',
  origin: '*',
})

type WikipediaQuery = {
  query: {
    pages: Record<string, { extract?: string }>
  }
}

export type Fetcher = (url: string) => Promise<Response>

const defaultFetcher: Fetcher = (url) => fetch(url)

export async function requestRandomExtract(
  fetcher: Fetcher = defaultFetcher,
): Promise<string> {
  const response = await fetcher(`${WIKI_API}?${RANDOM_ARTICLE_QUERY}`)

  if (!response.ok) {
    throw new Error(
      `Wikipedia request failed: ${response.status} ${response.statusText}`,
    )
  }

  const data: WikipediaQuery = await response.json()
  const [page] = Object.values(data.query.pages)

  if (!page?.extract) throw new Error('Wikipedia response has no extract')

  return page.extract
}
