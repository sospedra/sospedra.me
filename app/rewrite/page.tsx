import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import type { Metadata } from 'next'
import { REWRITE_DESC } from 'service/descriptions'
import { publicRewrites } from 'service/router'
import neonCss from 'service/style/neon.module.css'
import CopyButton from './copy-button'
import css from './rewrites.module.css'

export const metadata: Metadata = {
  title: 'Links',
  description: REWRITE_DESC,
  alternates: { canonical: '/r' },
}

export default function RewritesPage() {
  return (
    <Shell
      canonical='/r'
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>
      <h1 className='text-4xl'>Links shortener</h1>
      <h2>
        {REWRITE_DESC}. Click on the code to copy the shorten link in to your
        clipboard.
      </h2>

      <table className={css.rewrites}>
        <thead>
          <tr className='text-left'>
            <th className='w-1/4 p-2 sm:w-1/6'>Code</th>
            <th className='p-2 sm:w-1/3'>Title</th>
            <th className='w-3/4 p-2 sm:w-1/2'>Link</th>
          </tr>
        </thead>
        <tbody>
          {publicRewrites.map((rewrite) => (
            <tr key={rewrite.source}>
              <td title={`https://sospedra.me${rewrite.source}`}>
                <CopyButton className={css.copy} source={rewrite.source} />
              </td>
              <td className='p-2 truncate' title={rewrite.title}>
                {rewrite.title}
              </td>
              <td className='p-2 truncate' title={rewrite.destination}>
                <a className={neonCss.neon} href={rewrite.destination}>
                  {rewrite.destination}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  )
}
