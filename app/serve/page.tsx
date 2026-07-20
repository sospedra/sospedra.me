import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { SERVE_DESC } from 'service/descriptions'
import { pathsToTree } from 'service/io'
import staticFiles from 'service/io/static-files.json'
import ServeTree from './serve-tree'

export const metadata: Metadata = {
  title: 'Serve',
  description: SERVE_DESC,
  alternates: { canonical: '/static' },
}

export default async function ServePage() {
  'use cache'
  cacheLife('max')

  const tree = pathsToTree(staticFiles.map((p) => p.split('/')))

  return (
    <Shell
      canonical='/static'
      className='relative w-full h-full max-w-xl px-4 pt-12 pb-20 mx-auto text-white'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>

      <h1 className='pt-8 text-4xl'>Serve assets</h1>
      <p className='pb-10'>{SERVE_DESC}</p>

      <div className='pb-20'>
        {/* suspense keeps the page static while the tree reads ?e= on the client */}
        <Suspense>
          <ServeTree tree={tree} />
        </Suspense>
      </div>
    </Shell>
  )
}
