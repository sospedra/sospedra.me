import cn from 'clsx'
import { type JukeRecord, RECORDS, selectorCode } from './records'
import css from './strip-menu.module.css'

function Liner({ record }: { record: JukeRecord }) {
  return (
    <span className={css.liner}>
      <span>{record.oneLiner}</span>
      <span className={css.linerMeta}>
        pressed {record.pressed} · {record.stack}
        {record.lastSpin ? ` · last spin ${record.lastSpin}` : ''}
      </span>
    </span>
  )
}

export default function StripMenu({
  onPick,
  onHover,
}: {
  onPick: (record: JukeRecord) => void
  onHover: () => void
}) {
  return (
    <ul className={css.frame}>
      {RECORDS.map((record, index) => {
        const code = selectorCode(index)
        const pressed = record.status === 'pressed'
        return (
          <li key={record.id} className={css.slot}>
            <span className={css.dot} aria-hidden />
            <span className={css.code}>{code}</span>
            {pressed ? (
              <a
                className={css.strip}
                href={record.url}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey) return
                  event.preventDefault()
                  onPick(record)
                }}
                onMouseEnter={onHover}
              >
                <span className={css.title}>{record.title}</span>
                <Liner record={record} />
              </a>
            ) : (
              <span className={cn(css.strip, css.dud)} aria-disabled='true'>
                <span className={css.title}>{record.title}</span>
                <Liner record={record} />
                <span className={css.stamp}>test pressing</span>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
