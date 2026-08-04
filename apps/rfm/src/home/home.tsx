import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ErrorBanner } from '../components/error-banner.tsx'
import { Shell } from '../components/shell.tsx'
import { track } from '../services/analytics.ts'
import { fetcherRequestList } from '../services/github-api.ts'
import { List } from './list.tsx'
import { Newsletter } from './newsletter.tsx'
import { Search } from './search.tsx'

export const Home = () => {
  const [query, setQuery] = useState(' ')
  const { data, error } = useSWR(query, fetcherRequestList)

  useEffect(() => {
    if (query !== ' ') {
      track('search', { query, total: data?.total || 0 })
    }
  }, [query])

  return (
    <Shell>
      <Search setQuery={setQuery} />
      <a
        href='https://www.producthunt.com/posts/request-for-maintainers?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-request-for-maintainers'
        className='justify-center w-full'
        target='_blank'
        rel='noopener noreferrer'
      >
        <img
          src='https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=195531&theme=dark'
          alt='Request for maintainers - Find any OSS project calling for collaborators | Product Hunt Embed'
          width='250'
          height='54'
        />
      </a>
      <ErrorBanner error={error} />
      <List requestList={data?.requestList} total={data?.total} />
      <Newsletter />
    </Shell>
  )
}
