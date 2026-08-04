import cn from 'clsx'
import External from 'services/external'
import Link from 'services/link'
import css from './dish-row.module.css'
import { type Dish, PRICE, VERDICT_SR } from './menu-data'
import { NotebookDishEffect } from './notebook-ink'
import notebook from './notebook-ink.module.css'
import pen from './pen-marks.module.css'

const PEN_RING_SLOT = 'keyboard'
const PEN_ARROW_SLOT = 'shell'
const PEN_NOTES: Partial<Record<string, string>> = {
  laptop: 'since 2014!',
  chair: "chef's fav",
}

function PenRing() {
  return (
    <svg
      className={pen.penRing}
      viewBox='0 0 120 44'
      aria-hidden='true'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M12 24 Q10 7 58 5 Q112 3 112 20 Q113 37 60 39 Q14 41 11 26 Q10 20 18 15' />
    </svg>
  )
}

function PenArrow() {
  return (
    <svg
      className={pen.penArrow}
      viewBox='0 0 60 40'
      aria-hidden='true'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M6 30 Q22 12 46 18' />
      <path d='M38 8 L48 18 L34 24' />
      <path d='M8 8 Q10 4 14 6 M18 12 Q20 8 24 10' />
    </svg>
  )
}

function DishBody(props: { item: Dish }) {
  return (
    <>
      <span className={css.dishLine}>
        <span className={css.dishName}>{props.item.title}</span>
        <i className={css.leader} aria-hidden='true' />
        {props.item.verdict === 'goat' && (
          <b className={css.stamp} aria-hidden='true'>
            名物
          </b>
        )}
        <span className={css.price}>
          {props.item.slot === PEN_RING_SLOT && <PenRing />}
          {PRICE[props.item.verdict]}
          <span className='sr-only'>, {VERDICT_SR[props.item.verdict]}</span>
        </span>
      </span>
      <span className={css.dishNote}>
        <span className={css.slotTag} aria-hidden='true'>
          「{props.item.slot}」
        </span>
        {props.item.description}
      </span>
    </>
  )
}

export function DishRow(props: { item: Dish }) {
  const shared = {
    className: cn(css.dish, notebook.dish),
    'data-arrow-item': '',
    'data-verdict': props.item.verdict,
  }
  const note = PEN_NOTES[props.item.slot]
  const body = (
    <>
      <NotebookDishEffect />
      {props.item.slot === PEN_ARROW_SLOT && <PenArrow />}
      {note && (
        <span
          className={pen.penNote}
          data-note={props.item.slot}
          aria-hidden='true'
        >
          {note}
        </span>
      )}
      <DishBody item={props.item} />
    </>
  )
  if (props.item.link.kind === 'external') {
    return (
      <External href={props.item.link.href} {...shared}>
        {body}
      </External>
    )
  }
  return (
    <Link url={props.item.link.href} {...shared}>
      {body}
    </Link>
  )
}

export function DeadDish() {
  return (
    <span className={css.dishDead}>
      <span className={pen.penNote} data-note='gpu' aria-hidden='true'>
        only today!
      </span>
      <span className={css.dishLine}>
        <span className={css.dishName}>NVIDIA DGX H100, 8× H100 SXM 80GB</span>
        <i className={css.leader} aria-hidden='true' />
        <b className={css.soldStamp} aria-hidden='true'>
          売切
        </b>
        <span className={css.price}>
          ¥46,000,000
          <span className='sr-only'>, off the menu</span>
        </span>
      </span>
      <span className={css.dishNote}>
        <span className={css.slotTag} aria-hidden='true'>
          「gpu」
        </span>
        For the 70B-parameter broth. Nobody has ever ordered it. It stays on the
        wall so we remember the ceiling exists.
      </span>
    </span>
  )
}
