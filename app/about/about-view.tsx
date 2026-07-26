'use client'

import External from 'components/External'
import Link from 'components/Link'
import Role from 'components/Role'
import RouteHeader from 'components/RouteHeader'
import Row from 'components/Row'
import Shell from 'components/Shell'
import SpriteBust from 'components/Sprite/Bust'
import { useCallback, useState } from 'react'
import neonCss from 'service/style/neon.module.css'
import css from './about.module.css'
import NeonTattoos from './neon-tattoos'
import VaporFooter from './vapor-footer'

export default function AboutView(props: { years: number }) {
  const [$teleport, setTeleport] = useState<HTMLDivElement>()
  const captureTeleport = useCallback(
    (node: HTMLDivElement | null) => setTeleport(node ?? undefined),
    [],
  )

  return (
    <Shell
      className='relative w-full h-full max-w-4xl px-4 pt-12 pb-20 mx-auto text-white'
      canonical='/about'
    >
      <RouteHeader
        className={css.routeHeader}
        title='Rubén Sospedra'
        sector='03'
        status='Identity verified'
      />
      <NeonTattoos />

      <article className={css.content}>
        <Row
          force
          left={<Role />}
          right={
            <section className='mb-8'>
              <p className='pb-4'>
                I'm Rubén Sospedra, a full-stack engineer from Barcelona. I
                graduated in Political Science, then took a radical turn: a
                remote software internship. Computers and automation hooked me
                as a kid and never let go. For the past {props.years} years I
                have helped companies grow their products.
              </p>
              <p className='pb-4'>
                I co-founded a remote startup as CTO, owned developer experience
                for a 40-engineer org, and now set technical direction as a
                principal engineer. I stay close to the code: open source,
                conferences, teaching, writing. AI is a multiplier in my
                toolkit, not a crutch. The whole journey settled into one
                principle:{' '}
                <b className='font-bold'>
                  know when to move fast and when to get it right
                </b>
                . It's the skill behind every other skill.
              </p>
              <p>
                Want more? Let's{' '}
                <External href='https://x.com/sospedra_r'>chat</External>, read
                my{' '}
                <Link url='/manual' className={neonCss.neon}>
                  user-guide manual
                </Link>
                , or sneak on{' '}
                <Link url='/uses' className={neonCss.neon}>
                  what I use to work
                </Link>
                .
              </p>
            </section>
          }
        />
        <div className={css.sprite}>
          <SpriteBust />
        </div>
        <Row
          teleport={$teleport}
          left={
            <section className='pt-4 sm:p-0'>
              <h3>Education</h3>
              <p className='mb-4'>
                Associate’s in Computer Science
                <br />
                LaSalle Gràcia, 2013
              </p>
              <p>
                Bachelor’s in Political Science
                <br />
                Universitat de Barcelona, 2013
              </p>
            </section>
          }
          right={
            <section>
              <h3 className='relative'>
                Highlighted
                <span
                  title='Only the highlights. I worked at many companies over the years and never sat idle for more than a couple of months.'
                  className={css.question}
                >
                  ?
                </span>
                <span className='ml-2 sm:ml-4'>Experience</span>
              </h3>
              <h4>
                Principal engineer
                <br />
                Digg, Jul 2025 ▸ present
              </h4>
              <p>
                Set technical direction across mobile, web, and backend for a
                team of 8. Led the mobile platform from concept to release: a
                cross-platform app with 4.8+ store ratings. Built an AI
                knowledge system and cut onboarding time by 60%.
              </p>
            </section>
          }
        />

        <Row
          teleport={$teleport}
          left={
            <section className='pt-4 sm:p-0'>
              <h3>Achievements</h3>

              <ul>
                <li>
                  <Link className={neonCss.neon} url='/serve?e=talks'>
                    Public speaker
                  </Link>
                </li>
                <li>
                  <Link className={neonCss.neon} url='/papers'>
                    Write articles
                  </Link>
                </li>
                <li>OSS contributor & mentor</li>
                <li>Part-time lecturer</li>
                <li>
                  <p>
                    My{' '}
                    <Link url='/rubiks' className={css.rubik}>
                      <span>R</span>
                      <span>u</span>
                      <span>b</span>
                      <span>i</span>
                      <span>k</span>
                      {"'s"}
                    </Link>{' '}
                    record is <span title='2721ms'>27s</span>
                  </p>
                </li>
              </ul>
            </section>
          }
          right={
            <section className='mt-4'>
              <h4>
                Staff engineer & head of clients
                <br />
                Cameo, Oct 2019 ▸ Jul 2025
              </h4>
              <p>
                Led DX and client devops for 40 engineers: deploys went from
                under 12 a week to multiple daily. Led the iOS quality overhaul
                to a WWDC showcase: crash rate down from 2.1% to 0.3%, App Store
                rating up from 3.8 to 4.7.
              </p>
            </section>
          }
        />
        <Row
          teleport={$teleport}
          left={
            <section className='pt-4 sm:p-0'>
              <h3>Skills</h3>

              <ul>
                <li>typescript ~ rust ~ ruby</li>
                <li>react ~ react-native ~ next.js</li>
                <li>node.js ~ swift ~ kotlin</li>
                <li>postgres ~ mongodb ~ redis</li>
                <li>
                  <p>ai agents ~ rag ~ devops</p>
                </li>
              </ul>
            </section>
          }
          right={
            <section className='mt-4'>
              <h4>
                Lead software engineer
                <br />
                FreeNOW, Mar 2018 ▸ Oct 2019
              </h4>
              <p>
                Engineered the internal tools behind 10x user growth across 9
                markets. Architected a new driver registration flow: half the
                overhead, 5x the retention. Delivered regulation-compliant apps
                across complex legal standards.
              </p>
            </section>
          }
        />

        <Row
          teleport={$teleport}
          left={
            <section className='pt-4 sm:p-0'>
              <h3>Contact</h3>

              <ul>
                <li>
                  <External href='mailto:hello@sospedra.me'>
                    hello@sospedra.me
                  </External>
                </li>
                <li>
                  <External href='https://github.com/sospedra/sospedra'>
                    github
                  </External>
                </li>
                <li>
                  <External href='https://x.com/sospedra_r'>x.com</External>
                </li>
                <li>
                  <External href='https://sospedra.me/serve/cv.pdf'>
                    pdf version
                  </External>
                </li>
              </ul>
            </section>
          }
          right={
            <section className='mt-4'>
              <h4>
                Co-founder & CTO
                <br />
                Huballin, Dec 2013 ▸ Jan 2016
              </h4>
              <p>
                Built a B2B company from zero to $500k EBITDA. Hired and led the
                engineering team, set the technical culture, made every
                architectural decision. Balanced speed with quality under tight
                market constraints.
              </p>
            </section>
          }
        />

        <div ref={captureTeleport} />
      </article>

      <VaporFooter />
    </Shell>
  )
}
