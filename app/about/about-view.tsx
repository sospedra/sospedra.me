import AnomalyTrigger from 'components/AnomalyTrigger'
import External from 'components/External'
import Link from 'components/Link'
import Role from 'components/Role'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import SpriteBust from 'components/Sprite/Bust'
import neonCss from 'service/style/neon.module.css'
import css from './about.module.css'

export default function AboutView(props: { years: number }) {
  return (
    <Shell className={css.frame} canonical='/about'>
      <RouteHeader
        title='Rubén Sospedra'
        sector='03'
        status='Identity verified'
        description='Full-stack engineer, systems thinker and lifelong operator from Barcelona.'
      />

      <div className={css.layout}>
        <aside className={css.rail} aria-label='Operator profile'>
          <Role />
          <div className={css.sprite}>
            <SpriteBust />
          </div>

          <section>
            <h2>Education</h2>
            <p>
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

          <section>
            <h2>Achievements</h2>
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
                <AnomalyTrigger
                  anomaly='rubik'
                  className={css.rubikTrigger}
                  label='Log operator Rubik calibration'
                >
                  My{' '}
                  <span className={css.rubik} aria-hidden='true'>
                    <span>R</span>
                    <span>u</span>
                    <span>b</span>
                    <span>i</span>
                    <span>k</span>
                  </span>{' '}
                  record is <span title='2721ms'>27s</span>
                </AnomalyTrigger>
              </li>
            </ul>
          </section>

          <section>
            <h2>Skills</h2>
            <ul>
              <li>javascript ~ typescript</li>
              <li>react ~ css ~ react-native</li>
              <li>node.js ~ next.js</li>
              <li>mongodb ~ faunadb ~ redis</li>
              <li>devops ~ serverless ~ git</li>
            </ul>
          </section>

          <section>
            <h2>Contact</h2>
            <ul>
              <li>
                <External href='mailto:hello@sospedra.me'>email</External>
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
        </aside>

        <article className={css.content}>
          <section className={css.intro}>
            <p>
              This is Rubén Sospedra, a full-stack engineer from Barcelona.
              After graduating in Political Science I took a radical shift in my
              career and started a remote software internship. I have been
              interested in computers and automation since I was a kid and I'm a
              lifelong learner. For the past {props.years} years I have focused
              on helping companies grow their products.
            </p>
            <p>
              I founded a remote startup, collaborated with big and small
              companies and built internal tools. Continuously, I contribute to
              open source, speak at conferences, teach others and write
              articles. After this exciting journey I consolidated my most basic
              principle: <strong>deliver the best in the fastest way</strong>.
              It's a balance.
            </p>
            <p>
              If you want to know more about me, let's{' '}
              <External href='https://twitter.com/sospedra_r'>chat</External>,
              read my{' '}
              <Link url='/manual' className={neonCss.neon}>
                user-guide manual
              </Link>
              , or sneak a look at{' '}
              <Link url='/uses' className={neonCss.neon}>
                what I use to work
              </Link>
              .
            </p>
          </section>

          <section className={css.experience}>
            <header>
              <p>CAREER LOG / SELECTED</p>
              <h2>
                Highlighted experience{' '}
                <abbr title='Only the most relevant experience is shown.'>
                  ?
                </abbr>
              </h2>
            </header>

            <section>
              <p className={css.period}>Oct 2019 ▸ present</p>
              <h3>Independent contractor</h3>
              <p className={css.company}>Self-employed</p>
              <p>
                Work with multiple startups around the globe. Build green-field
                projects that help key metrics. Lead performance projects where
                we move from a TTI of 6s to 1.2s. Create software modules that
                elevate solution quality, maintenance and delivery speed.
              </p>
            </section>

            <section>
              <p className={css.period}>Mar 2018 ▸ Oct 2019</p>
              <h3>Lead software engineer</h3>
              <p className={css.company}>FreeNOW</p>
              <p>
                Develop internal tools that allow the company to grow 10x.
                Design, architect and implement a driver-registration system
                that cuts costs in half and increases engagement. Empower teams
                to be autonomous and encourage them to make decisions.
              </p>
            </section>

            <section>
              <p className={css.period}>Dec 2013 ▸ Jan 2016</p>
              <h3>Co-founder &amp; CTO</h3>
              <p className={css.company}>Huballin</p>
              <p>
                Build a company from scratch. Learn the true meaning of agile:
                ship fast, get feedback and iterate. Hire and mentor a talented
                team. Define the culture and develop the functional
                architecture.
              </p>
            </section>
          </section>
        </article>
      </div>
    </Shell>
  )
}
