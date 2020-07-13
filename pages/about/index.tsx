import React, { useRef, useState, useEffect } from 'react'
import neonCss from 'service/style/neon.module.css'
import Shell from 'components/Shell'
import SpriteBust from 'components/Sprite/Bust'
import Link, { LinkBack } from 'components/Link'
import External from 'components/External'
import Row from 'components/Row'
import Role from 'components/Role'
import css from './about.module.css'
import Emoji from 'components/Emoji'

const About: React.FC<{}> = () => {
  const teleportRef = useRef<HTMLDivElement>(null)
  const [$teleport, setTeleport] = useState<HTMLDivElement>()

  useEffect(() => {
    setTeleport(teleportRef.current as HTMLDivElement)
  }, [])

  return (
    <Shell
      title='About'
      className='relative w-full h-full max-w-4xl px-4 pt-12 pb-20 mx-auto text-white'
      description='javascript hacker ▼ fullstack engineer contractor'
      canonical='/about'
    >
      <Row
        right={
          <Link url='/'>
            <LinkBack>Home</LinkBack>
          </Link>
        }
      />

      <article className={css.content}>
        <Row
          right={
            <h1 className='pt-2 pb-8 font-serif text-4xl text-cyan-300'>
              Rubén Sospedra
            </h1>
          }
        />
        <Row
          force
          left={<Role />}
          right={
            <section className='mb-8'>
              <p className='pb-4'>
                This is Rubén Sospedra, a full-stack engineer from Barcelona.
                After graduating in Political Science I took a radical shift in
                my career and started a remote software internship. I have been
                interested in computers and automation since I was a kid and I'm
                a lifelong learner. For the past{' '}
                {new Date().getUTCFullYear() - 2014} years I have focused on
                helping companies grow their products.
              </p>
              <p>
                I founded a remote startup, collaborated with big and small
                companies, built internal tools. Continuously, I contribute to
                open source, speak at conferences, teach others and write
                articles. After this exciting journey I consolidated my most
                basic principle: deliver top-quality software goal-oriented in a
                balanced time to market.
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
                  title='Only the most relevant experience is shown. I worked in multiple companies throughout my career and I have never been stall for more than a couple of months.'
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
                Work with multiple startups around the globe. Build green fields
                projects that helps towards the key metrics. Lead performance
                projects where we move from a TTI of 6s to 1.2s. Create new
                software modules that elevate the quality of the solution,
                increasing maintenance and delivery speed.
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
                Develop internal tools that allows the company to grow 10x.
                Design, architect and implement a new driver registration that
                cuts costs to half and increases engagement. Empower teams to be
                autonomous and encourage them to take decisions.
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
                agile: ship fast, get feedback and iterate. Hire and mentor a
                full team of talented people. Define and spread the overall
                culture and company values. Envision, coordinate and develop the
                functional architecture.
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
                  <External href='https://sospedra.me/serve/sospedra.pdf'>
                    pdf version
                  </External>
                </li>
                <li>
                  <Link url='/serve?e=licenses' className={neonCss.neon}>
                    licenses
                  </Link>
                </li>
              </ul>
            </section>
          }
        />

        <div ref={teleportRef} />
      </article>
    </Shell>
  )
}

export default About
