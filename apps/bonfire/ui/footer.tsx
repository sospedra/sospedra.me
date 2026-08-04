import clsx from 'clsx'
import { ExternalLink } from 'ui/external-link'
import css from './footer.module.css'

export function Footer() {
  return (
    <footer className='flex text-xs italic text-center'>
      <p>
        hand-crafted with{' '}
        <span aria-label='purple heart' className='mr-1' role='img'>
          💜
        </span>{' '}
        by{' '}
        <ExternalLink
          className={clsx('inline-block', css.signature)}
          href='https://sospedra.me'
        >
          sospedra
        </ExternalLink>
      </p>
    </footer>
  )
}
