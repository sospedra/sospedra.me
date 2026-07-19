import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getStaticFiles, pathsToTree } from 'service/io'
import { SERVE_DESC } from 'service/descriptions'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import ServeTree from './serve-tree'

export const metadata: Metadata = {
  title: 'Serve',
  description: SERVE_DESC,
  alternates: { canonical: '/static' },
}

export default async function ServePage() {
  const paths = []
  for await (const file of getStaticFiles('public')) {
    paths.push(file)
  }
  const tree = pathsToTree(paths.map((p) => p.split('/')))

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
