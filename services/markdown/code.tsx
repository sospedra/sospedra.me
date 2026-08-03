import cn from 'clsx'
import { Children, isValidElement, type ReactNode } from 'react'
import css from './code.module.css'
import CopyButton from './copy-button'

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

const stripTrailingNewline = (text: string) =>
  text.endsWith('\n') ? text.slice(0, -1) : text

const CodeBlock = ({
  children,
  className,
  style,
  ...props
}: React.ComponentPropsWithoutRef<'pre'>) => {
  const source = stripTrailingNewline(getText(children))
  const lines = source ? source.split('\n').length : 0
  const lineWord = lines === 1 ? 'line' : 'lines'

  return (
    <figure
      aria-label={`Code sample, ${lines} ${lineWord}`}
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
            {String(lines).padStart(2, '0')} {lineWord.toUpperCase()}
          </span>
          <CopyButton source={source} />
        </span>
      </figcaption>
      <pre
        {...props}
        className={cn(className, css.source)}
        style={{ ...style, backgroundColor: 'var(--paper-code-bg)' }}
        tabIndex={props.tabIndex ?? 0}
      >
        {children}
      </pre>
    </figure>
  )
}

export default CodeBlock
