import cn from 'clsx'
import ArrowNav from 'services/arrow-nav'
import External, { X_PROFILE_URL } from 'services/external'
import Link, { LinkBack } from 'services/link'
import Shell from 'services/shell'
import menu from './course-banner.module.css'
import { DeadDish, DishRow } from './dish-row'
import fx from './fx-quiet.module.css'
import { Charms } from './margin-charms'
import { DISH_COUNT, MENU, SPECIAL_COUNT } from './menu-data'
import paper from './menu-sheet.module.css'
import { NeonRamen } from './neon-marquee'
import { NotebookFilters } from './notebook-ink'
import css from './ramen.module.css'

const FLAPS = [...'ABCDEFGHIJKLMNOPQRSTUV']

function Lantern(props: { className: string; glyph: string }) {
  return (
    <div className={props.className} aria-hidden='true'>
      <i className={css.cord} />
      <b className={cn(css.chochin, fx.chochin)} lang='ja'>
        {props.glyph}
      </b>
      <i className={css.tassel} />
    </div>
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

      <div className={cn(css.valance, fx.valance)} aria-hidden='true'>
        {FLAPS.map((flap) => (
          <i key={flap} />
        ))}
      </div>

      <div className={cn(css.scene, fx.scene)}>
        <nav className={css.topNav} aria-label='Uses navigation'>
          <Link url='/' className={cn(css.homePlaque, fx.homePlaque)}>
            <LinkBack>Home</LinkBack>
          </Link>
        </nav>
        <p className={css.sector}>SECTOR 07 / NOODLE BAR / OPEN LATE</p>

        <NeonRamen />
        <Lantern className={cn(css.lanternA, fx.lanternA)} glyph='麺' />
        <Lantern className={cn(css.lanternB, fx.lanternB)} glyph='旨' />

        <section className={paper.sheet} aria-label='Menu'>
          <i className={cn(paper.tape, paper.tapeLeft)} aria-hidden='true' />
          <i className={cn(paper.tape, paper.tapeRight)} aria-hidden='true' />
          <i className={cn(paper.tape, paper.tapeSideL)} aria-hidden='true' />
          <i className={cn(paper.tape, paper.tapeSideR)} aria-hidden='true' />
          <i className={paper.wear} aria-hidden='true' />
          <i className={paper.stainRing} aria-hidden='true' />
          <i className={paper.stainDrops} aria-hidden='true' />
          <i className={paper.stainBowl} aria-hidden='true' />
          <i className={paper.stainSplat} aria-hidden='true' />
          <i className={paper.stainRun} aria-hidden='true' />
          <Charms />
          <NotebookFilters />

          <header className={paper.masthead}>
            <p className={paper.eyebrow}>
              <span lang='ja'>お品書き</span> · tonight's menu
            </p>
            <p className={paper.shopName} aria-hidden='true'>
              <span lang='ja' className={paper.shopMark}>
                麺屋
              </span>
              <span className={paper.shopScript}>Sospedra</span>
            </p>
            <svg
              className={paper.brushLine}
              viewBox='0 0 200 12'
              aria-hidden='true'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M4 8 Q60 2 120 6 Q160 9 196 4' />
            </svg>
            <p className={paper.tagline}>
              tools served nightly since 2013 · broth aged {props.level} years ·
              barcelona
            </p>
            <p className={paper.story}>
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
            <section key={section.title} className={menu.course}>
              <header className={menu.banner}>
                <span className={menu.bannerKanji} lang='ja' aria-hidden='true'>
                  {section.course.kanji}
                </span>
                <h2 className={menu.bannerTitle}>
                  {section.course.name}
                  <span className={menu.bannerSub}> · {section.title}</span>
                </h2>
                <span
                  className={menu.bannerNumeral}
                  lang='ja'
                  aria-hidden='true'
                >
                  {section.course.numeral}
                </span>
              </header>
              <p className={menu.courseNote}>{section.course.note}</p>
              <ul className={menu.dishes}>
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

          <footer className={paper.chit}>
            <p>
              {DISH_COUNT} dishes on the wall · {SPECIAL_COUNT} house specials{' '}
              <span lang='ja' aria-hidden='true'>
                名物
              </span>
            </p>
            <p>
              complaints at the counter:{' '}
              <External className={paper.chitLink} href={X_PROFILE_URL}>
                fight me
              </External>
            </p>
            <p>tax included · opinions final · no substitutions</p>
          </footer>

          <b className={paper.hanko} lang='ja' aria-hidden='true'>
            ソ
          </b>
        </section>
      </div>

      <ArrowNav />
    </Shell>
  )
}
