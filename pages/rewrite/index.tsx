import React from 'react'
import { publicRewrites } from 'service/router'
import neonCss from 'service/style/neon.module.css'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import css from './rewrites.module.css'

export const REWRITE_DESC = 'Personal links that I share often'

const Rewrites: React.FC<{}> = () => {
  return (
    <Shell
      title='Links'
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
      description={REWRITE_DESC}
      canonical='/r'
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
                <button
                  className={css.copy}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://sospedra.me${rewrite.source}`,
                    )
                  }}
                >
                  {rewrite.source}
                </button>
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

export default Rewrites
