import cn from 'clsx'
import ArrowNav from 'components/ArrowNav'
import External, { X } from 'components/External'
import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import type { Route } from 'next'
import css from './ramen.module.css'
import uses from './uses.json'

type Item = (typeof uses)[number]['items'][number]

/* the price is the verdict: yen encode the tier, the story explains it */
const PRICE = {
  goat: '¥1,300',
  buy: '¥980',
  fine: '¥750',
  cheap: '¥380',
} as Record<string, string>

const VERDICT_SR = {
  goat: 'goat tier, house special',
  buy: 'buy tier',
  fine: 'fine tier',
  cheap: 'go-cheap tier',
} as Record<string, string>

/* hardware holds the meal, daily drivers are the base, apps season it */
const COURSES = {
  Workstation: {
    numeral: '其の一',
    kanji: '器',
    name: 'The bowls',
    note: 'hardware: the vessels everything gets served in',
  },
  'Editor + Terminal': {
    numeral: '其の二',
    kanji: '出汁',
    name: 'The broth',
    note: 'the base everything else cooks in',
  },
  'Desktop Apps': {
    numeral: '其の三',
    kanji: '薬味',
    name: 'The toppings',
    note: 'small extras, strong flavor',
  },
} as Record<
  string,
  { numeral: string; kanji: string; name: string; note: string }
>

const ITEMS = uses.flatMap((section) => section.items)
const DISH_COUNT = ITEMS.length
const SPECIAL_COUNT = ITEMS.filter((item) => item.verdict === 'goat').length

const FLAPS = [...'ABCDEFGHIJKLMNOPQRSTUV']

/* red-pen marks the owner left on his own menu */
const PEN_RING_SLOT = 'keyboard'
const PEN_ARROW_SLOT = 'shell'
const PEN_NOTES = {
  laptop: 'since 2014!',
  chair: "chef's fav",
} as Record<string, string>

function PenRing() {
  return (
    <svg
      className={css.penRing}
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
      className={css.penArrow}
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

function DishBody(props: { item: Item }) {
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

function DishRow(props: { item: Item }) {
  const shared = { className: css.dish, 'data-arrow-item': '' }
  const note = PEN_NOTES[props.item.slot]
  const body = (
    <>
      {props.item.slot === PEN_ARROW_SLOT && <PenArrow />}
      {note && (
        <span
          className={css.penNote}
          data-note={props.item.slot}
          aria-hidden='true'
        >
          {note}
        </span>
      )}
      <DishBody item={props.item} />
    </>
  )
  if (props.item.url.startsWith('http')) {
    return (
      <External href={props.item.url} {...shared}>
        {body}
      </External>
    )
  }
  return (
    <Link url={props.item.url as Route} {...shared}>
      {body}
    </Link>
  )
}

/* the one bowl nobody orders; 86'd but it stays on the wall */
function DeadDish() {
  return (
    <span className={css.dishDead}>
      <span className={css.penNote} data-note='gpu' aria-hidden='true'>
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

/* hand-bent katakana in a gunmetal frame, cables run to the roof */
function NeonRamen() {
  return (
    <div className={css.marquee} aria-hidden='true'>
      <div className={css.steam}>
        <i />
        <i />
        <i />
      </div>
      <i className={cn(css.cable, css.cableA)} />
      <i className={cn(css.cable, css.cableB)} />
      <i className={cn(css.cable, css.cableC)} />
      <div className={css.neonFrame}>
        <svg
          className={css.neonSign}
          viewBox='0 0 460 152'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M22 34 Q58 26 94 32' />
          <path d='M20 62 Q60 54 96 60 Q90 104 46 128' />
          <g className={css.neonLoose}>
            <path d='M124 88 Q170 80 214 86' />
            <path className={css.neonCore} d='M124 88 Q170 80 214 86' />
          </g>
          <path d='M262 30 Q272 78 226 126' />
          <path d='M232 62 Q272 90 306 122' />
          <path d='M332 44 Q344 48 352 58' />
          <path d='M330 122 Q378 114 408 50' />
          <path className={css.neonDrip} d='M46 128 l6 9 l-9 4 l7 10' />
          <path className={css.neonDrip} d='M306 122 l7 8 l-9 3 l7 10' />
          <path className={css.neonCore} d='M22 34 Q58 26 94 32' />
          <path
            className={css.neonCore}
            d='M20 62 Q60 54 96 60 Q90 104 46 128'
          />
          <path className={css.neonCore} d='M262 30 Q272 78 226 126' />
          <path className={css.neonCore} d='M232 62 Q272 90 306 122' />
          <path className={css.neonCore} d='M332 44 Q344 48 352 58' />
          <path className={css.neonCore} d='M330 122 Q378 114 408 50' />
        </svg>
        {/* one cold tube of the site's cyan, wired into the same frame */}
        <svg
          className={css.neonAccent}
          viewBox='0 0 140 12'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M5 8 Q70 2 135 6' />
        </svg>
      </div>
    </div>
  )
}

function Lantern(props: { className: string; glyph: string }) {
  return (
    <div className={props.className} aria-hidden='true'>
      <i className={css.cord} />
      <b className={css.chochin} lang='ja'>
        {props.glyph}
      </b>
      <i className={css.tassel} />
    </div>
  )
}

/* the margin menagerie: stickers and charms collected over the years */
function Charms() {
  return (
    <>
      <span
        className={cn(css.sticker, css.stickerStamp)}
        aria-hidden='true'
        lang='ja'
      >
        麺
      </span>
      <span className={cn(css.charm, css.omamori)} aria-hidden='true'>
        <i className={css.charmCord} />
        <b className={css.omamoriBody} lang='ja'>
          開運
        </b>
      </span>
      <span className={cn(css.sticker, css.stickerPill)} aria-hidden='true' />
      <span className={cn(css.sticker, css.daruma)} aria-hidden='true'>
        <i className={css.darumaFace} />
      </span>
      <span className={cn(css.sticker, css.ofuda)} aria-hidden='true' lang='ja'>
        深夜営業
      </span>
      <span className={cn(css.sticker, css.bowlSticker)} aria-hidden='true'>
        <svg
          viewBox='0 0 100 96'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            className={css.bowlSteam}
            d='M34 20 Q28 12 34 4 M50 22 Q44 12 50 2 M66 20 Q60 12 66 4'
          />
          <path d='M58 10 L86 38 M70 6 L92 30' />
          <path d='M8 44 Q50 34 92 44' />
          <path d='M12 46 Q16 84 50 87 Q84 84 88 46' />
          <path d='M24 40 Q30 28 36 40 Q42 28 48 40' />
        </svg>
      </span>
      <span className={cn(css.charm, css.fuurin)} aria-hidden='true'>
        <i className={css.charmCord} />
        <b className={css.fuurinBell} />
        <i className={css.fuurinStrip} lang='ja'>
          涼
        </i>
      </span>
      <span className={cn(css.sticker, css.stickerBurst)} aria-hidden='true'>
        <b className={css.burstInner} lang='ja'>
          うまい!
        </b>
      </span>
      <span className={cn(css.charm, css.ema)} aria-hidden='true'>
        <i className={css.charmCord} />
        <b className={css.emaBoard} lang='ja'>
          麺
        </b>
      </span>
    </>
  )
}

export default function RamenView(props: { level: number }) {
  return (
    <Shell canonical='/uses' className={css.den} shellClassName={css.scroller}>
      <h1 className='sr-only'>Uses</h1>
      <p className='sr-only'>
        The tools behind every part of my work, served as the menu of a
        late-night ramen bar. The idea comes from uses.tech. If you don't agree,
        fight me.
      </p>

      <div className={css.valance} aria-hidden='true'>
        {FLAPS.map((flap) => (
          <i key={flap} />
        ))}
      </div>

      <div className={css.scene}>
        <nav className={css.topNav} aria-label='Uses navigation'>
          <Link url='/' className={css.homePlaque}>
            <LinkBack>Home</LinkBack>
          </Link>
        </nav>
        <p className={css.sector}>SECTOR 07 / NOODLE BAR / OPEN LATE</p>

        <NeonRamen />
        <Lantern className={css.lanternA} glyph='麺' />
        <Lantern className={css.lanternB} glyph='旨' />

        <section className={css.sheet} aria-label='Menu'>
          <i className={cn(css.tape, css.tapeLeft)} aria-hidden='true' />
          <i className={cn(css.tape, css.tapeRight)} aria-hidden='true' />
          <i className={cn(css.tape, css.tapeSideL)} aria-hidden='true' />
          <i className={cn(css.tape, css.tapeSideR)} aria-hidden='true' />
          <i className={css.wear} aria-hidden='true' />
          <i className={css.stainRing} aria-hidden='true' />
          <i className={css.stainDrops} aria-hidden='true' />
          <i className={css.stainBowl} aria-hidden='true' />
          <i className={css.stainSplat} aria-hidden='true' />
          <i className={css.stainRun} aria-hidden='true' />
          <Charms />

          <header className={css.masthead}>
            <p className={css.eyebrow}>
              <span lang='ja'>お品書き</span> · tonight's menu
            </p>
            <p className={css.shopName} aria-hidden='true'>
              <span lang='ja' className={css.shopMark}>
                麺屋
              </span>
              <span className={css.shopScript}>Sospedra</span>
            </p>
            <svg
              className={css.brushLine}
              viewBox='0 0 200 12'
              aria-hidden='true'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M4 8 Q60 2 120 6 Q160 9 196 4' />
            </svg>
            <p className={css.tagline}>
              tools served nightly since 2013 · broth aged {props.level} years ·
              barcelona
            </p>
            <p className={css.story}>
              The house always lived by the terminal. Like every honest dev
              kitchen we hang a <b>/uses</b> page: the exact hardware and
              software behind the daily service, no display pieces, no sponsors.
              The tradition comes from{' '}
              <External href='https://uses.tech'>uses.tech</External>, where
              hundreds of developers publish what they really work with.
              Everything on this wall gets used daily.
            </p>
          </header>

          {uses.map((section) => {
            const course = COURSES[section.title]
            return (
              <section key={section.title} className={css.course}>
                <header className={css.banner}>
                  <span
                    className={css.bannerKanji}
                    lang='ja'
                    aria-hidden='true'
                  >
                    {course.kanji}
                  </span>
                  <h2 className={css.bannerTitle}>
                    {course.name}
                    <span className={css.bannerSub}> · {section.title}</span>
                  </h2>
                  <span
                    className={css.bannerNumeral}
                    lang='ja'
                    aria-hidden='true'
                  >
                    {course.numeral}
                  </span>
                </header>
                <p className={css.courseNote}>{course.note}</p>
                <ul className={css.dishes}>
                  {section.items.map((item) => (
                    <li key={item.title}>
                      <DishRow item={item} />
                    </li>
                  ))}
                  {section.title === 'Workstation' && (
                    <li>
                      <DeadDish />
                    </li>
                  )}
                </ul>
              </section>
            )
          })}

          <footer className={css.chit}>
            <p>
              {DISH_COUNT} dishes on the wall · {SPECIAL_COUNT} house specials{' '}
              <span lang='ja' aria-hidden='true'>
                名物
              </span>
            </p>
            <p>
              complaints at the counter:{' '}
              <External className={css.chitLink} href={X}>
                fight me
              </External>
            </p>
            <p>tax included · opinions final · no substitutions</p>
          </footer>

          <b className={css.hanko} lang='ja' aria-hidden='true'>
            ソ
          </b>
        </section>
      </div>

      <ArrowNav />
    </Shell>
  )
}
