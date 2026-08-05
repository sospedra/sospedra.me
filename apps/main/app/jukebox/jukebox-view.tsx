'use client'

import Dome from './dome'
import css from './jukebox.module.css'
import KeyPad from './key-pad'
import { RECORDS } from './records'
import StripMenu from './strip-menu'

export default function JukeboxView() {
  return (
    <main className={css.hall}>
      <section className={css.cabinet} aria-label='side projects jukebox'>
        <h1 className={css.marquee}>side projects</h1>
        <Dome nowPlaying={RECORDS[0]} />
        <StripMenu onPick={() => {}} />
        <KeyPad armed={null} onLetter={() => {}} onNumber={() => {}} />
      </section>
    </main>
  )
}
