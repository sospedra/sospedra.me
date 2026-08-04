import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import SpriteBust from 'services/bust'
import Link, { LinkBack } from 'services/link'
import Shell from 'services/shell'
import css from './manual.module.css'
import ManualKeys from './manual-keys'
import Page from './manual-page'
import Piece from './piece'
import SpriteManual from './sprites/sprites'
import Step from './step'
import VerificationStamp from './verification-stamp'

export const metadata: Metadata = {
  title: 'Manual of instructions',
  description:
    'How to work with Rubén Sospedra. A manual of instructions: what I value, how I look at problems, where my blind spots are, and how to earn my trust.',
  alternates: { canonical: '/manual' },
}

function CommissioningCheck({
  children,
  id,
}: {
  children: ReactNode
  id: string
}) {
  return (
    <li className={css.commissioningCheck}>
      <input className={css.commissioningInput} id={id} type='checkbox' />
      <label className={css.commissioningLabel} htmlFor={id}>
        <svg
          className={css.commissioningGlyph}
          width='45'
          height='45'
          viewBox='0 0 95 95'
          aria-hidden='true'
        >
          <rect
            className={css.commissioningBox}
            x='30'
            y='20'
            width='50'
            height='50'
          />
          <g transform='translate(0,-952.36222)'>
            <path
              className={css.commissioningMark}
              d='m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4'
            />
          </g>
        </svg>
        <span>{children}</span>
      </label>
    </li>
  )
}

export default function ManualPage() {
  return (
    <Shell className={css.frame}>
      <nav className={css.manualNav} aria-label='Manual controls'>
        <Link url='/'>
          <LinkBack>Home</LinkBack>
        </Link>
        <p>SECTOR 04.1 / RS-19911201-11 / READ PROTOCOL / [ ] FLIP SHEETS</p>
      </nav>

      {/* react 19 hoists resource links, next/head dies with the app router */}
      <link rel='preload' as='image' href='/sospedra.png' />

      <Page className={css.cover} wear='stapled'>
        <header className={css.documentHeader}>
          <p>
            <span>Personal interface unit</span>
            <strong>Operating &amp; service manual</strong>
          </p>
          <p>
            <span>Document</span>
            <strong>RS-19911201-11</strong>
          </p>
        </header>

        <div className={css.coverGrid}>
          <div className={css.coverCopy}>
            <p className={css.eyebrow}>MODEL RS–91 / HUMAN, TYPE 01</p>
            <h1 className={css.title} aria-label='Sospedra'>
              <span>SOS</span>
              <span>PE</span>
              <span>DRA</span>
            </h1>
            <p className={css.coverSummary}>
              Instructions for installation, normal operation, communication,
              maintenance and fault diagnosis. Read before first contact. Retain
              for future reference.
            </p>
            <dl className={css.specification}>
              <div>
                <dt>Accepted input</dt>
                <dd>Context + evidence</dd>
              </div>
              <div>
                <dt>Nominal output</dt>
                <dd>Software + opinions</dd>
              </div>
              <div>
                <dt>Communications</dt>
                <dd>Async / distributed</dd>
              </div>
            </dl>
          </div>

          <figure className={css.coverFigure}>
            <div className={css.bust}>
              <SpriteBust />
            </div>
            <span className={css.calloutA}>A1 / OPERATOR</span>
            <span className={css.calloutB}>CAL. 1991–12</span>
            <figcaption>FIG. 00 — FRONT ELEVATION / NOT TO SCALE</figcaption>
          </figure>
        </div>

        <div className={css.calibrationStrip}>
          <div>
            <span>CALIBRATION TRACE</span>
            <strong>CH–01 / 0.8 V</strong>
          </div>
          <svg
            className={css.trace}
            viewBox='0 0 480 72'
            role='img'
            aria-label='Stable calibration waveform'
          >
            <path d='M0 36h42l12-24 22 48 19-38 18 28 22-14h42l13-25 21 50 22-44 23 38 18-19h43l14-26 19 52 22-45 22 39 18-20h48' />
          </svg>
          <img
            alt='Sospedra inspection mark'
            src='/sospedra.png'
            className={css.logo}
          />
        </div>
      </Page>

      <Page className={css.safetyPage} wear='stained'>
        <header className={css.sectionHeader}>
          <span>SECTION 01</span>
          <div>
            <h2>Precautions &amp; initial setup</h2>
            <p>Read all notices before placing the unit in service.</p>
          </div>
        </header>

        <ManualKeys />

        <div className={css.commissioningGrid}>
          <section>
            <h3>1.1 Before commissioning</h3>
            <ul className={css.commissioningChecklist}>
              <CommissioningCheck id='manual-check-assumptions'>
                Remove assumptions, stale requirements and meeting residue.
              </CommissioningCheck>
              <CommissioningCheck id='manual-check-objective'>
                Supply one clear objective and the evidence needed to act.
              </CommissioningCheck>
              <CommissioningCheck id='manual-check-mode'>
                Select <b>SPEED</b> or <b>PRECISION</b>. Do not force both
                without reducing scope.
              </CommissioningCheck>
              <CommissioningCheck id='manual-check-honour'>
                Confirm the honour interlock is engaged before applying
                workload.
              </CommissioningCheck>
            </ul>
          </section>
          <aside className={css.serviceBulletin}>
            <p>
              <strong>FACTORY SERVICE BULLETIN 04-B</strong>
              <span>AUTHORIZED PERSONNEL ONLY</span>
            </p>
            <p>
              Do not disclose the{' '}
              <span
                className={css.redacted}
                role='img'
                aria-label='redacted service information'
              >
                secondary coffee protocol
              </span>{' '}
              or bypass code{' '}
              <span
                className={css.redacted}
                role='img'
                aria-label='redacted service information'
              >
                JUPITER FORTY
              </span>
              .
            </p>
          </aside>
        </div>

        <div className={css.warningGrid}>
          <div>
            <p className={css.warningTitle}>
              <b>WARNING</b>
              <span>EN / 01</span>
            </p>
            <p>
              Serious or fatal emotion injuries can occur from not reading this
              document in advance. To prevent this situation you must
              acknowledge what's on the manual with the included attached pun
              jokes.
            </p>
          </div>
          <div lang='ca'>
            <p className={css.warningTitle}>
              <b>ATENCIÓ</b>
              <span>CA / 02</span>
            </p>
            <p>
              Risc de lesions emocionals series o fatals és poden produir si no
              es llegeix aquest document. Per prevenir aquesta situación vosté
              ha de comprendre allò qué está escrit en el manual. Incloses les
              bromes dolentes.
            </p>
          </div>
          <div lang='es'>
            <p className={css.warningTitle}>
              <b>ADVERTENCIA</b>
              <span>ES / 03</span>
            </p>
            <p>
              Pueden producirse lesiones emocionales graves o fatales si no lee
              este documento. Para evitar dicha situación, debe entenderse lo
              que se encuentra escrito en el manual. Incluidas las bromas
              adjuntas.
            </p>
          </div>
        </div>
      </Page>

      <Page className={css.partsPage} wear='folded'>
        <header className={css.sectionHeader}>
          <span>SECTION 02</span>
          <div>
            <h2>Illustrated component inventory</h2>
            <p>Confirm component count before placing the unit in service.</p>
          </div>
        </header>
        <div className={css.partsGrid}>
          <Piece quantity={19} id={101811}>
            <SpriteManual name='demons' />
          </Piece>
          <Piece quantity={91} id={101933}>
            <SpriteManual name='triangle' />
          </Piece>
          <Piece quantity={12} id={102053}>
            <SpriteManual name='insert' />
          </Piece>
          <Piece quantity={1} id={101697}>
            <SpriteManual name='mobius' />
            <span className={css.penTally} aria-hidden='true'>
              only one??
            </span>
          </Piece>
          <div className={css.widePart}>
            <Piece quantity={11} id={102287}>
              <SpriteManual name='count' />
            </Piece>
          </div>
        </div>
      </Page>
      <Page className={css.procedurePage} wear='creased'>
        <header className={css.sectionHeader}>
          <span>SECTION 03</span>
          <div>
            <h2>Operating principles</h2>
            <p>How the unit defines success and communicates.</p>
          </div>
        </header>
        <Step number={1} title='How I view success'>
          <p>
            Success isn't vertical. Nor a straight path. Resiliency is the real
            success. Failing over and over, until you get there.
          </p>
          <p>
            But there's more. All the winds are bad if a ship doesn't know
            where's heading. You need a goal, a clear one. And to focus on it.
          </p>
          <p>
            In the software industry. You need also to find a balance between
            achieving your perfect goal and being quick. We work in a fast-paced
            world. Every minute counts, make it valuable.
          </p>
          <p>
            Finally, there's no winning without honour. The rule is simple:{' '}
            <span className={css.penMark}>if it's not right, don't do it</span>.
          </p>
        </Step>
        <Step number={2} title='How I communicate'>
          <p>
            Right to the point. I don't like blatantly. Short yet accurate
            sentences. I appreciate funny messages, as well. I don't think
            you're more righteous if you speak more seriously.
          </p>
          <p>
            Everything is about the content. The envelope is nice but focus on
            the content. Don't waste anyone's time. Make sure that you checked
            first.
          </p>
          <p>
            Async and distributed over everything else. Does this need to be a
            meeting? Probably could be an email. Or a slack message. Rule of
            thumb: think about me as if{' '}
            <span className={css.textHighlight}>I'm working from Jupiter</span>{' '}
            thus real-time comms don't work.
          </p>
        </Step>
        <span className={css.penData} aria-hidden='true'>
          async or nothing!
        </span>
      </Page>
      <Page className={css.procedurePage} wear='stained'>
        <header className={css.sectionHeader}>
          <span>SECTION 04</span>
          <div>
            <h2>Operating characteristics</h2>
            <p>Normal behaviour of the unit. Not a malfunction.</p>
          </div>
        </header>
        <Step number={3} title='Things I do that may annoy you'>
          <p>
            I can be too harsh sometimes. Well, not really. I can sound too
            harsh. It's probably a side-effect caused by the async comms. It
            takes a lot for me to get angry, so{' '}
            <span className={css.penMark}>don't worry about it</span>.
          </p>
          <p>
            I don't want to listen to opinions (if I don't ask for them). I'm
            driven by data only. I already have an opinion about almost
            anything. And I don't need another.
          </p>
          <p>
            I have a dark sense of humour. If I offend you I'm sorry. Really I
            am. Please, let me know and I'll adapt my jokes to you.
          </p>
          <p className={css.cautionLine}>
            <b>CAUTION —</b> Confirm tone before diagnosing hostility.
          </p>
        </Step>
        <Step number={4} title='What gains and loses my trust'>
          <p>
            Loyalty is the best. Lying is the worst. I can understand almost
            anything. Just try to explain it.{' '}
            <span className={css.textHighlight}>Don't lie to me.</span>
          </p>
          <p>
            Now, regarding day-to-day work. Taking ownership of your task is a
            massive trust boost. I deeply respect people with such mindset.
          </p>
          <p>
            Does that mean that you have to work extra hours? Extra effort?
            Extra extra? Nope, that's bad. In my culture, such behaviour means
            that you need to overwork to achieve your goals. If there's
            something that goes bad, just be transparent. No big deal.
          </p>
        </Step>
        <span className={css.penScope} aria-hidden='true'>
          scope ≠ weekend
        </span>
      </Page>
      <Page className={css.procedurePage} wear='folded'>
        <header className={css.sectionHeader}>
          <span>SECTION 05</span>
          <div>
            <h2>Strengths</h2>
            <p>Rated capabilities of the unit.</p>
          </div>
        </header>
        <Step number={5} title='My strengths'>
          <p>
            I'm thoughtful. I'm strategic and I like to plan. Having a good
            amount of data around me to make the right decision.
          </p>
          <p>
            I'm also stubborn but in a good way. Since I try to not be
            opinionated, I have a clear focus and a well-defined goal. So, being
            stubborn means a better output.
          </p>
          <p>
            I understand. Understand other problems and needs. Understand
            business operations and the market. Understand the context.{' '}
            <span className={css.textHighlight}>
              This life is about adapting.
            </span>
          </p>
        </Step>
        <header className={css.sectionHeader}>
          <span>SECTION 06</span>
          <div>
            <h2>Troubleshooting</h2>
            <p>Consult the fault table before escalating.</p>
          </div>
        </header>
        <Step title='Fault diagnosis & corrective action'>
          <table>
            <thead>
              <tr>
                <th scope='col'>Observed condition</th>
                <th scope='col'>Probable cause</th>
                <th scope='col'>Corrective action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label='Observed condition'>Reply contains one line</td>
                <td data-label='Probable cause'>
                  Deep-work mode; no malfunction detected
                </td>
                <td data-label='Corrective action'>
                  Send one asynchronous ping and wait. Do not escalate to a
                  call.
                </td>
              </tr>
              <tr>
                <td data-label='Observed condition'>
                  Review contains many questions
                </td>
                <td data-label='Probable cause'>
                  Request or PR arrived without context
                </td>
                <td data-label='Corrective action'>
                  Add the rationale, constraints and evidence; request review
                  again.
                </td>
              </tr>
              <tr>
                <td data-label='Observed condition'>
                  Unit asks “do we have data on this?”
                </td>
                <td data-label='Probable cause'>
                  Opinion supplied without evidence
                </td>
                <td data-label='Corrective action'>
                  Attach numbers or clearly label the input as a hypothesis.
                </td>
              </tr>
              <tr>
                <td data-label='Observed condition'>
                  Unscheduled{' '}
                  <span role='img' aria-label='redacted service information'>
                    ███
                  </span>{' '}
                  event
                </td>
                <td data-label='Probable cause'>
                  <span
                    className={css.redacted}
                    role='img'
                    aria-label='redacted service information'
                  >
                    factory field anomaly
                  </span>
                </td>
                <td data-label='Corrective action'>
                  Return HOME, restore context and act normal.
                </td>
              </tr>
            </tbody>
          </table>
        </Step>
        <div className={css.maintenanceRecord}>
          <p>Maintenance record — to be completed by the operator</p>
          <table>
            <thead>
              <tr>
                <th scope='col'>Date</th>
                <th scope='col'>Service performed</th>
                <th scope='col'>Sig.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className={css.penNote}>1991-12</span>
                </td>
                <td>
                  <span className={css.penNote}>unit commissioned</span>
                </td>
                <td>
                  <span className={css.penNote}>RS</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className={css.penNote}>2026-07</span>
                </td>
                <td>
                  <span className={css.penNote}>
                    manual reprinted — midnight io edition
                  </span>
                </td>
                <td>
                  <span className={css.penNote}>RS</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className={css.penNote}>ongoing</span>
                </td>
                <td>
                  <span className={css.penNote}>
                    efficiency patch: one task at a time
                  </span>
                </td>
                <td>
                  <span className={css.penNote}>RS</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className={css.penNote}>next</span>
                </td>
                <td>
                  <a
                    className={css.recordContact}
                    href='mailto:hello@sospedra.me?subject=RS-91%20service%20request'
                  >
                    {/* data-paper-media opts out of the global cyan prose-link rule */}
                    <span data-paper-media='true'>
                      your entry here — email the unit
                    </span>
                  </a>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Page>
      <VerificationStamp />
    </Shell>
  )
}
