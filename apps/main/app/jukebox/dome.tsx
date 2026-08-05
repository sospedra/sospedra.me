import css from './dome.module.css'
import type { JukeRecord } from './records'

export default function Dome({ nowPlaying }: { nowPlaying: JukeRecord }) {
  return (
    <div className={css.dome} aria-hidden>
      <div className={css.carousel}>
        <div className={css.stack} />
        <div className={css.platter}>
          <div className={css.disc} />
        </div>
      </div>
      <p className={css.lamp}>
        NOW PLAYING <span className={css.lampTitle}>{nowPlaying.title}</span>
      </p>
    </div>
  )
}
