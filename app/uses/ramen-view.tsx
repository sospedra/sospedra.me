import cn from 'clsx'
import type { Route } from 'next'
import ArrowNav from 'services/arrow-nav'
import External, { X_PROFILE_URL } from 'services/external'
import Link, { LinkBack } from 'services/link'
import Shell from 'services/shell'
import css from './ramen.module.css'
import uses from './uses.json'

type RawSection = (typeof uses)[number]
type RawItem = RawSection['items'][number]

type Verdict = 'goat' | 'buy' | 'fine' | 'cheap'

const PRICE = {
  goat: '¥1,300',
  buy: '¥980',
  fine: '¥750',
  cheap: '¥380',
} satisfies Record<Verdict, string>

const VERDICT_SR = {
  goat: 'goat tier, house special',
  buy: 'buy tier',
  fine: 'fine tier',
  cheap: 'go-cheap tier',
} satisfies Record<Verdict, string>

type Course = { numeral: string; kanji: string; name: string; note: string }
type CourseTitle = 'Workstation' | 'Editor + Terminal' | 'Desktop Apps'

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
} satisfies Record<CourseTitle, Course>

const isVerdict = (value: string): value is Verdict => value in PRICE
const isCourseTitle = (value: string): value is CourseTitle => value in COURSES

type DishLink =
  | { kind: 'external'; href: string }
  | { kind: 'internal'; href: Route }

type Dish = {
  title: string
  description: string
  slot: string
  verdict: Verdict
  link: DishLink
}

type MenuCourse = {
  title: CourseTitle
  course: Course
  dishes: Dish[]
}

const toDish = (item: RawItem): Dish => {
  if (!isVerdict(item.verdict)) {
    throw new Error(`Unknown verdict in uses.json — ${item.verdict}`)
  }
  return {
    title: item.title,
    description: item.description,
    slot: item.slot,
    verdict: item.verdict,
    link: item.url.startsWith('http')
      ? { kind: 'external', href: item.url }
      : { kind: 'internal', href: item.url as Route },
  }
}

const toMenuCourse = (section: RawSection): MenuCourse => {
  if (!isCourseTitle(section.title)) {
    throw new Error(`Unknown course in uses.json — ${section.title}`)
  }
  return {
    title: section.title,
    course: COURSES[section.title],
    dishes: section.items.map(toDish),
  }
}

const MENU = uses.map(toMenuCourse)
const DISHES = MENU.flatMap((section) => section.dishes)
const DISH_COUNT = DISHES.length
const SPECIAL_COUNT = DISHES.filter((dish) => dish.verdict === 'goat').length

const FLAPS = [...'ABCDEFGHIJKLMNOPQRSTUV']

const PEN_RING_SLOT = 'keyboard'
const PEN_ARROW_SLOT = 'shell'
const PEN_NOTES: Partial<Record<string, string>> = {
  laptop: 'since 2014!',
  chair: "chef's fav",
}

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

function NotebookDishEffect() {
  return (
    <>
      <svg
        className={css.notebookFlourish}
        viewBox='0 0 256 256'
        aria-hidden='true'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M243.07324,157.43945c-1.2334-1.47949-23.18847-27.34619-60.46972-41.05859-1.67579-17.97412-8.25293-34.36328-18.93653-46.87158C149.41309,52.8208,128.78027,44,104,44,54.51074,44,22.10059,88.57715,20.74512,90.4751a3.99987,3.99987,0,0,0,6.50781,4.65234C27.5625,94.6958,58.68359,52,104,52c22.36816,0,40.89648,7.85107,53.584,22.70508,8.915,10.437,14.65625,23.9541,16.65528,38.894A133.54185,133.54185,0,0,0,136,108c-25.10742,0-46.09473,6.48486-60.69434,18.75391-12.65234,10.63379-19.91015,25.39355-19.91015,40.49463a43.61545,43.61545,0,0,0,12.69336,31.21923C76.98438,207.3208,89.40234,212,104,212c23.98047,0,44.37305-9.4668,58.97461-27.37744,12.74512-15.6333,20.05566-37.145,20.05566-59.01953,0-.1128-.001-.22559-.001-.33838,33.62988,13.48486,53.62207,36.96631,53.89746,37.2959a4.00015,4.00015,0,0,0,6.14648-5.1211ZM104,204c-27.89746,0-40.60449-19.05078-40.60449-36.75146C63.39551,142.56592,86.11621,116,136,116a124.37834,124.37834,0,0,1,38.97266,6.32617q.05712,1.63038.05761,3.27686C175.03027,177.07129,139.29785,204,104,204Z' />
      </svg>
      <svg
        className={css.notebookHighlight}
        viewBox='0 0 144.75738 77.18431'
        preserveAspectRatio='none'
        aria-hidden='true'
        xmlns='http://www.w3.org/2000/svg'
      >
        <g transform='translate(-171.52826,-126.11624)'>
          <path d='M180.02826,169.45123c0,0 12.65228,-25.55115 24.2441,-25.66863c6.39271,-0.06479 -5.89143,46.12943 4.90937,50.63857c10.22345,4.2681 24.14292,-52.38336 37.86455,-59.80493c3.31715,-1.79413 -5.35094,45.88889 -0.78872,58.34589c5.19371,14.18125 33.36934,-58.38221 36.43049,-56.91633c4.67078,2.23667 -0.06338,44.42744 5.22574,47.53647c6.04041,3.55065 19.87185,-20.77286 19.87185,-20.77286' />
        </g>
      </svg>
    </>
  )
}

function NotebookFilters() {
  return (
    <svg
      className={css.notebookFilters}
      width='0'
      height='0'
      aria-hidden='true'
      focusable='false'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <filter
          id='usesNotebookNoise'
          x='-20%'
          y='-20%'
          width='140%'
          height='140%'
        >
          <feTurbulence
            result='noise'
            numOctaves='8'
            baseFrequency='0.1'
            type='fractalNoise'
          />
          <feDisplacementMap
            in='SourceGraphic'
            in2='noise'
            scale='3'
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
        <filter
          id='usesNotebookNoiseAlt'
          x='-20%'
          y='-20%'
          width='140%'
          height='140%'
        >
          <feTurbulence
            result='noise'
            numOctaves='8'
            baseFrequency='0.1'
            seed='1010'
            type='fractalNoise'
          />
          <feDisplacementMap
            in='SourceGraphic'
            in2='noise'
            scale='3'
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
        <filter
          id='usesNotebookNoisePress'
          x='-30%'
          y='-30%'
          width='160%'
          height='160%'
        >
          <feTurbulence
            result='noise'
            numOctaves='8'
            baseFrequency='0.1'
            type='fractalNoise'
          />
          <feDisplacementMap
            in='SourceGraphic'
            in2='noise'
            scale='6'
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
        <filter
          id='usesNotebookNoisePressAlt'
          x='-30%'
          y='-30%'
          width='160%'
          height='160%'
        >
          <feTurbulence
            result='noise'
            numOctaves='8'
            baseFrequency='0.1'
            seed='1010'
            type='fractalNoise'
          />
          <feDisplacementMap
            in='SourceGraphic'
            in2='noise'
            scale='6'
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
      </defs>
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

function DishRow(props: { item: Dish }) {
  const shared = {
    className: css.dish,
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
    <Shell className={css.den} shellClassName={css.scroller}>
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
          <NotebookFilters />

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

          {MENU.map((section) => (
            <section key={section.title} className={css.course}>
              <header className={css.banner}>
                <span className={css.bannerKanji} lang='ja' aria-hidden='true'>
                  {section.course.kanji}
                </span>
                <h2 className={css.bannerTitle}>
                  {section.course.name}
                  <span className={css.bannerSub}> · {section.title}</span>
                </h2>
                <span
                  className={css.bannerNumeral}
                  lang='ja'
                  aria-hidden='true'
                >
                  {section.course.numeral}
                </span>
              </header>
              <p className={css.courseNote}>{section.course.note}</p>
              <ul className={css.dishes}>
                {section.dishes.map((item) => (
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
          ))}

          <footer className={css.chit}>
            <p>
              {DISH_COUNT} dishes on the wall · {SPECIAL_COUNT} house specials{' '}
              <span lang='ja' aria-hidden='true'>
                名物
              </span>
            </p>
            <p>
              complaints at the counter:{' '}
              <External className={css.chitLink} href={X_PROFILE_URL}>
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
