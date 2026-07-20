import { Children, isValidElement, type ReactNode } from 'react'
import CopyButton from './CopyButton'
import css from './code.module.css'

const getText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)

  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }
      if (!isValidElement<{ children?: ReactNode }>(child)) return ''
      return getText(child.props.children)
    })
    .join('')
}

const CodeBlock = ({
  children,
  className,
  style,
  ...props
}: React.ComponentPropsWithoutRef<'pre'>) => {
  const source = getText(children).replace(/\n$/, '')
  const lines = source ? source.split('\n').length : 0

  return (
    <figure
      aria-label={`Code sample, ${lines} ${lines === 1 ? 'line' : 'lines'}`}
      className={css.frame}
      data-code-frame='true'
    >
      <figcaption className={css.chrome}>
        <span className={css.identity}>
          <span aria-hidden='true' className={css.signal} />
          <span>{'CODE // TRANSMISSION'}</span>
        </span>
        <span className={css.meta}>
          <span>
            {String(lines).padStart(2, '0')} {lines === 1 ? 'LINE' : 'LINES'}
          </span>
          <CopyButton />
        </span>
      </figcaption>
      <pre
        {...props}
        className={[className, css.source].filter(Boolean).join(' ')}
        style={{ ...style, backgroundColor: 'var(--paper-code-bg, #100d1a)' }}
        tabIndex={props.tabIndex ?? 0}
      >
        {children}
      </pre>
    </figure>
  )
}

export default CodeBlock
