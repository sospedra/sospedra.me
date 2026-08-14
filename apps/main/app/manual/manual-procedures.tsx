import Page from './manual-page'
import css from './manual-procedures.module.css'
import sectionCss from './manual-section.module.css'
import Step from './step'

export default function ManualProcedures() {
  return (
    <>
      <Page className={sectionCss.procedurePage} wear='creased'>
        <header className={sectionCss.sectionHeader}>
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
      <Page className={sectionCss.procedurePage} wear='stained'>
        <header className={sectionCss.sectionHeader}>
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
          <p className={sectionCss.cautionLine}>
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
      <Page className={sectionCss.procedurePage} wear='folded'>
        <header className={sectionCss.sectionHeader}>
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
        <header className={sectionCss.sectionHeader}>
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
                  Unit idle on handheld terminals
                </td>
                <td data-label='Probable cause'>
                  Contents settled during shipment
                </td>
                <td data-label='Corrective action'>
                  Shake the unit firmly until the override engages.
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
                    className={sectionCss.redacted}
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
    </>
  )
}
