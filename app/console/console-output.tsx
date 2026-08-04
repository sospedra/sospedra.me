import cn from 'clsx'
import { match } from 'ts-pattern'
import { codeOf, type LinkEntry, type Output, ROUTES } from './command-shell'
import { CONSOLE_HELP } from './console-commands'
import css from './console-output.module.css'
import type { ConsoleOutput, Entry } from './console-reducer'
import TreeView from './tree-view'

export type Execute = (commands: string[]) => void

function Listing(props: {
  listing: Extract<Output, { kind: 'listing' }>
  execute: Execute
}) {
  const { path, dirs, files } = props.listing
  const base = path === '/' ? '' : path

  return (
    <div className={css.block}>
      <p className={cn(css.line, css.dim)}>
        Directory of S:{path.toUpperCase()}
      </p>
      <div className={css.grid}>
        {dirs.map((dir) => (
          <button
            key={dir}
            type='button'
            className={css.dirItem}
            onClick={() => props.execute([`cd ${base}/${dir}`, 'ls'])}
          >
            [{dir}]
          </button>
        ))}
        {files.map((file) => (
          <a
            key={file}
            className={css.fileItem}
            href={`${base}/${file}`}
            target='_blank'
            rel='noreferrer'
          >
            {file}
          </a>
        ))}
      </div>
      <p className={cn(css.line, css.dim)}>
        {dirs.length} dir(s) · {files.length} file(s)
      </p>
    </div>
  )
}

function LinksTable(props: { links: LinkEntry[]; execute: Execute }) {
  return (
    <div className={css.block}>
      <div className={cn(css.linkRow, css.dim)} aria-hidden='true'>
        <span>CODE</span>
        <span>TITLE</span>
        <span>DESTINATION</span>
      </div>
      {props.links.map((link) => (
        <div key={link.source} className={css.linkRow}>
          <button
            type='button'
            className={css.dirItem}
            onClick={() => props.execute([`url ${codeOf(link)}`])}
          >
            {codeOf(link)}
          </button>
          <span>{link.title}</span>
          <a
            className={css.fileItem}
            href={link.destination}
            target='_blank'
            rel='noreferrer'
          >
            {link.destination}
          </a>
        </div>
      ))}
      <p className={cn(css.line, css.dim)}>
        OPEN &lt;code&gt; launches · URL &lt;code&gt; copies the short url
      </p>
    </div>
  )
}

function HelpTable() {
  return (
    <div className={css.block}>
      {CONSOLE_HELP.map(([command, description]) => (
        <div key={command} className={css.helpRow}>
          <span className={css.bright}>{command.toUpperCase()}</span>
          <span className={css.dim}>{description}</span>
        </div>
      ))}
      <div className={css.helpRow}>
        <span className={css.bright}>KEYS</span>
        <span className={css.dim}>
          TAB completes · ↑↓ history · F1 help · F3 exit · F6 clear · F9 links
        </span>
      </div>
      <div className={css.helpRow}>
        <span className={css.bright}>ROUTES</span>
        <span className={css.dim}>
          {ROUTES.map(([name]) => name.toUpperCase()).join(' · ')}
        </span>
      </div>
    </div>
  )
}

function OutputView(props: {
  output: ConsoleOutput
  paths: string[]
  links: LinkEntry[]
  execute: Execute
}) {
  return match(props.output)
    .with({ kind: 'text' }, (output) => (
      <p className={cn(css.line, output.tone && css[output.tone])}>
        {output.text || ' '}
      </p>
    ))
    .with({ kind: 'listing' }, (output) => (
      <Listing listing={output} execute={props.execute} />
    ))
    .with({ kind: 'links' }, () => (
      <LinksTable links={props.links} execute={props.execute} />
    ))
    .with({ kind: 'help' }, () => <HelpTable />)
    .with({ kind: 'tree' }, ({ segments }) => (
      <TreeView paths={props.paths} segments={segments} />
    ))
    .exhaustive()
}

export function CommandLog(props: {
  entries: Entry[]
  paths: string[]
  links: LinkEntry[]
  execute: Execute
}) {
  const { paths, links, execute } = props

  return (
    <div role='log' aria-live='polite'>
      {props.entries.map((entry) => (
        <div className={css.entry} key={entry.id}>
          {entry.prompt !== undefined && (
            <p className={css.line}>
              <span className={css.promptLabel}>{entry.prompt} </span>
              {entry.command}
            </p>
          )}
          {entry.output.map((output, index) => (
            <OutputView
              // biome-ignore lint/suspicious/noArrayIndexKey: entries append once and never reorder
              key={index}
              output={output}
              paths={paths}
              links={links}
              execute={execute}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
