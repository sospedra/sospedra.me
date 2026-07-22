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
                I founded a remote startup, worked with companies big and small,
                built internal tools. I contribute to open source, speak at
                conferences, teach and write. The whole journey settled into one
                principle:{' '}
                <b className='font-bold'>deliver the best in the fastest way</b>
                . It's a balance.
              </p>
              <p>
                Want more? Let's{' '}
                <External href='https://twitter.com/sospedra_r'>chat</External>,
                read my{' '}
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
                LaSalle Gràcia, 2014
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
                Independent contractor
                <br />
                Self-employed, Oct 2019 ▸ present
              </h4>
              <p>
                Work with startups around the globe. Build greenfield projects
                and move their key metrics. Lead performance projects: TTI down
                from 6s to 1.2s. Ship new software modules and raise both
                quality and delivery speed.
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
                <li>Part-time lecturer</li>
                <li>
                  <p>
                    My{' '}
                    <span className={css.rubik}>
                      <span>R</span>
                      <span>u</span>
                      <span>b</span>
                      <span>i</span>
                      <span>k</span>
                      {"'s"}
                    </span>{' '}
                    record is <span title='2721ms'>27s</span>
                  </p>
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
                Develop the internal tools behind a 10x company growth. Design
                and ship a new driver registration: half the cost, more
                engagement. Empower teams to own their decisions.
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
                <li>javascript ~ typescript</li>
                <li>react ~ css ~ react-native</li>
                <li>node.js ~ next.js</li>
                <li>mongodb ~ faunadb ~ redis</li>
                <li>
                  <p>devops ~ serverless ~ git</p>
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
                Build a whole company from scratch. Learn the true meaning of
                agile: ship fast, get feedback, iterate. Hire and mentor a full
                team of talented people. Define the culture and spread it.
                Envision and develop the functional architecture.
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
                  <External href='https://twitter.com/sospedra_r'>
                    twitter
                  </External>
                </li>
                <li>
                  <External href='https://sospedra.me/serve/cv.pdf'>
                    pdf version
                  </External>
                </li>
              </ul>
            </section>
          }
        />

        <div ref={captureTeleport} />
      </article>

      <VaporFooter />
    </Shell>
  )
}
