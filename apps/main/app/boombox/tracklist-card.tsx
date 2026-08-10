import { range } from 'es-toolkit'
import {
  type BoomboxState,
  type Guess,
  type GuessScore,
  MAX_GUESSES,
} from './engine'
import pen from './guess-line.module.css'
import css from './tracklist-card.module.css'

export const SCORE_LABEL = {
  album: 'Right album',
  artist: 'Right artist',
  decade: 'Right decade',
  hit: 'Correct',
  miss: 'No match',
  skip: 'Skipped',
  year: 'Right year',
} satisfies Record<GuessScore, string>

const SCORE_NOTE = {
  album: 'right album!',
  artist: 'right artist!',
  decade: 'close decade',
  hit: '',
  miss: '',
  skip: '',
  year: 'right year!',
} satisfies Record<GuessScore, string>

const NoteEntry = (props: { guess: Guess }) => {
  const circled = props.guess.score === 'hit'
  const note = SCORE_NOTE[props.guess.score]

  return (
    <>
      <span className={circled ? pen.circled : pen.crossed}>
        {props.guess.label}
        <span className='sr-only'> ({SCORE_LABEL[props.guess.score]})</span>
      </span>
      {note !== '' && <small className={pen.marginScribble}>{note}</small>}
    </>
  )
}

type PaperProps = {
  guesses: Guess[]
  stage: BoomboxState['stage']
  input: React.ReactNode
  dropdown: React.ReactNode
}

export const CaseTracklist = (props: PaperProps) => (
  <aside className={css.caseScene} aria-label='Attempts'>
    <div className={css.caseRig}>
      <div className={css.casePaper}>
        <h2 className={css.caseTitle}>
          tracklist <small>· today's guesses</small>
        </h2>
        <p className={css.caseRule}>side a · type i · c-90</p>
        <ol className={css.trackRows}>
          {range(MAX_GUESSES).map((slot) => {
            const guess = props.guesses[slot]
            const active =
              props.stage === 'play' && slot === props.guesses.length
            return (
              <li
                key={`track-${slot}`}
                data-long={(guess?.label.length ?? 0) > 22}
                data-active={active}
              >
                {guess && <NoteEntry guess={guess} />}
                {active && props.input}
                {active && props.dropdown}
              </li>
            )
          })}
        </ol>
        <div className={css.caseFoot}>
          <span>dolby off</span>
          <span lang='ca'>rebobina abans, va</span>
        </div>
      </div>
      <span className={css.caseSpine} aria-hidden />
      <div className={css.caseArm} aria-hidden>
        <span className={css.armFloor}>
          <span className={css.armPost} data-post='a' />
          <span className={css.armPost} data-post='b' />
        </span>
        <span className={css.armBack} />
        <span className={css.armWall} data-side='top' />
        <span className={css.armWall} data-side='bottom' />
        <span className={css.armWall} data-side='rim' />
        <span className={css.armWall} data-side='hinge' />
      </div>
    </div>
  </aside>
)
