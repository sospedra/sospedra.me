'use client'

import cn from 'clsx'
import Cheatcodes from 'components/Cheatcodes'
import External from 'components/External'
import Link from 'components/Link'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import SpriteCar from 'components/Sprite/Car'
import SpriteMountain from 'components/Sprite/Mountain'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import {
  BAZAAR_DESC,
  MANUAL_DESC,
  REWRITE_DESC,
  SERVE_DESC,
  USES_DESC,
} from 'service/descriptions'
import { useScroll } from 'service/scroll'
import css from './bazaar.module.css'

type StallProps = {
  channel: string
  description: ReactNode
  href?: Route | `https://${string}`
  isExternal?: boolean
  isSecret?: boolean
  label: string
  status: string
  tone: 'cyan' | 'pink' | 'yellow'
}

function Stall({
  channel,
  description,
  href,
  isExternal = false,
  isSecret = false,
  label,
  status,
  tone,
}: StallProps) {
  const title = isSecret ? (
    <Cheatcodes className={css.stallAction} />
  ) : isExternal ? (
    <External href={href as string} className={css.stallAction}>
      {label}
    </External>
  ) : (
    <Link url={href as Route} className={css.stallAction}>
      {label}
    </Link>
  )

  return (
    <li className={css.stall} data-tone={tone}>
      <span className={css.starNode} aria-hidden='true'>
        <span>✦</span>
      </span>
      <div className={css.awning} aria-hidden='true' />
      <div className={css.stallPanel}>
        <div className={css.stallMeta}>
          <span>STALL {channel}</span>
          <span className={css.openSign}>{status}</span>
        </div>
        <h3>{title}</h3>
        <div className={css.description}>{description}</div>
        <p className={css.stallFooter} aria-hidden='true'>
          <span>{isExternal ? 'external outpost' : 'local arcade'}</span>
          <span>
            {isSecret ? 'open hatch' : isExternal ? 'launch ↗' : 'enter →'}
          </span>
        </p>
      </div>
    </li>
  )
}

function ConstellationRoute() {
  return (
    <svg
      className={css.constellation}
      viewBox='0 0 1000 1900'
      preserveAspectRatio='none'
      aria-hidden='true'
      focusable='false'
    >
      <path
        className={css.routeGlow}
        d='M206 104 L785 304 L214 502 L766 705 L235 914 L788 1112 L205 1314 L760 1512 L242 1785'
      />
      <path
        className={css.routeSignal}
        pathLength='1'
        d='M206 104 L785 304 L214 502 L766 705 L235 914 L788 1112 L205 1314 L760 1512 L242 1785'
      />
      <g className={css.routeNodes}>
        <circle cx='206' cy='104' r='8' />
        <circle cx='785' cy='304' r='8' />
        <circle cx='214' cy='502' r='8' />
        <circle cx='766' cy='705' r='8' />
        <circle cx='235' cy='914' r='8' />
        <circle cx='788' cy='1112' r='8' />
        <circle cx='205' cy='1314' r='8' />
        <circle cx='760' cy='1512' r='8' />
        <circle cx='242' cy='1785' r='8' />
      </g>
    </svg>
  )
}

export default function BazaarView() {
  const [isHorizonHidden, setIsHorizonHidden] = useState(false)
  const handleScroll = useCallback(
    (event: Event & { target: { scrollTop: number } }) => {
      setIsHorizonHidden(event.target.scrollTop > 240)
    },
    [],
  )
  const scrollRef = useScroll(handleScroll)

  return (
    <Shell canonical='/bazaar' shellClassName={css.shell}>
      <div className={css.scroll} ref={scrollRef}>
        <div className={css.starField} aria-hidden='true' />
        <div className={css.bazaar}>
          <RouteHeader
            className={css.routeHeader}
            title='Bazaar'
            sector='04'
            status='Night market open'
            description={BAZAAR_DESC}
          />

          <section className={css.marketGate} aria-labelledby='market-title'>
            <div className={css.bulbRail} aria-hidden='true'>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className={css.overline}>✦ LIVE ON THE WORLD WIDE WEB ✦</p>
            <h2 id='market-title'>Tonight&apos;s directory</h2>
            <p className={css.intro}>
              Follow the electric thread through a tiny night market of tools,
              curiosities, and useful corners of the internet.
            </p>
            <dl className={css.marketStats}>
              <div>
                <dt>stalls</dt>
                <dd>09</dd>
              </div>
              <div>
                <dt>local arcades</dt>
                <dd>05</dd>
              </div>
              <div>
                <dt>remote outposts</dt>
                <dd>04</dd>
              </div>
            </dl>
            <p className={css.bestViewed}>
              hand-coded · best viewed after midnight · all signals live
            </p>
          </section>

          <div
            className={css.ticker}
            role='status'
            aria-label='Bazaar status: all nine stalls are open, admission is free, curiosities are encouraged.'
          >
            <div className={css.tickerTrack} aria-hidden='true'>
              <span>
                ✦ ALL 9 STALLS OPEN ✦ ADMISSION: FREE ✦ CURIOSITIES ENCOURAGED ✦
                BCN LOCAL TIME ✦
              </span>
              <span>
                ✦ ALL 9 STALLS OPEN ✦ ADMISSION: FREE ✦ CURIOSITIES ENCOURAGED ✦
                BCN LOCAL TIME ✦
              </span>
            </div>
          </div>

          <section className={css.directory} aria-labelledby='stalls-title'>
            <div className={css.directoryHeader}>
              <div>
                <p>CONSTELLATION 04-B</p>
                <h2 id='stalls-title'>Choose a stall</h2>
              </div>
              <p className={css.legend}>
                <span>
                  <i className={css.localKey} /> local
                </span>
                <span>
                  <i className={css.remoteKey} /> outpost
                </span>
              </p>
            </div>

            <div className={css.mapFrame}>
              <span className={css.cornerTop} aria-hidden='true'>
                +
              </span>
              <span className={css.cornerBottom} aria-hidden='true'>
                +
              </span>
              <ConstellationRoute />
              <ul className={css.marketList}>
                <Stall
                  channel='01'
                  label='user guide manual'
                  href='/manual'
                  description={MANUAL_DESC}
                  status='OPEN 24H'
                  tone='pink'
                />
                <Stall
                  channel='02'
                  label='uses'
                  href='/uses'
                  description={USES_DESC}
                  status='IN STOCK'
                  tone='cyan'
                />
                <Stall
                  channel='03'
                  label='serve assets'
                  href='/serve'
                  description={SERVE_DESC}
                  status='SELF-SERVE'
                  tone='yellow'
                />
                <Stall
                  channel='04'
                  label='rewrites'
                  href='/rewrite'
                  description={REWRITE_DESC}
                  status='HOT LINKS'
                  tone='pink'
                />
                <Stall
                  channel='??'
                  label='Cheatcodes'
                  description='wait wat?'
                  status='PSSST…'
                  tone='yellow'
                  isSecret
                />
                <Stall
                  channel='05'
                  label='rfm'
                  href='https://rfm.sospedra.me'
                  description={
                    <>
                      Track OSS <b>requests for maintainers</b>. Find any
                      project calling for collaborators.
                    </>
                  }
                  status='OSS RADIO'
                  tone='cyan'
                  isExternal
                />
                <Stall
                  channel='06'
                  label='reinput'
                  href='https://reinput.sospedra.me'
                  description='A React Native TextInput with material style 😎'
                  status='NATIVE GOODS'
                  tone='pink'
                  isExternal
                />
                <Stall
                  channel='07'
                  label='spg'
                  href='https://spg.sospedra.me'
                  description={
                    <>
                      Secure passwords that humans can read 🗝
                      <br />
                      Generate passwords that are semantically correct. The
                      passwords are more secure the longer they are. They
                      don&apos;t need symbols or special characters at all. We
                      end up using cryptic passwords that are impossible to
                      type. This generator uses NLP technology to create
                      semantically meaningful passwords.
                    </>
                  }
                  status='KEY MAKER'
                  tone='yellow'
                  isExternal
                />
                <Stall
                  channel='08'
                  label='which key code'
                  href='https://keycodes.sospedra.me'
                  description='Which keys map to what keyboard code?'
                  status='PRESS ANY KEY'
                  tone='cyan'
                  isExternal
                />
              </ul>
            </div>
          </section>

          <footer className={css.marketFooter}>
            <p>YOU HAVE REACHED THE EDGE OF THE MARKET</p>
            <Link url='/' className={css.exitLink}>
              ← take the night road home
            </Link>
          </footer>
        </div>
      </div>

      <aside
        className={cn(css.horizon, {
          [css.horizonHidden]: isHorizonHidden,
        })}
        aria-hidden='true'
      >
        <div className={css.car}>
          <SpriteCar />
        </div>
        <SpriteMountain />
      </aside>
    </Shell>
  )
}
