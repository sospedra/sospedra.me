'use client'

import css from './jukebox.module.css'
import { RECORDS, selectorCode } from './records'

export default function JukeboxView() {
  return (
    <main className={css.hall}>
      <h1 className={css.marquee}>side projects</h1>
      <ul className={css.strips}>
        {RECORDS.map((record, index) => (
          <li key={record.id} className={css.strip}>
            <a href={record.url}>
              {selectorCode(index)} {record.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
