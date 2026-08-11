import css from './neubrutalism.module.css'
import {
  AUDIT_ITEMS,
  AXES,
  type Axes,
  HOUSE_RULES,
  matches,
  SCALLOP_POINTS,
  SCHEDULE,
  TICKER,
  TIERS,
  VENUE,
} from './neubrutalism-data'

export const Ticker = () => (
  <div className={css.ticker} aria-hidden='true'>
    <div className={css.tickerTrack}>
      <span className={css.tickerText}>{TICKER}</span>
      <span className={css.tickerText}>{TICKER}</span>
    </div>
  </div>
)

type BadgeProps = { label: string; className: string }

export const Badge = ({ label, className }: BadgeProps) => (
  <span className={`${css.badge} ${className}`} aria-hidden='true'>
    <svg viewBox='0 0 120 120' className={css.scallop} aria-hidden='true'>
      <polygon
        points={SCALLOP_POINTS}
        fill='#58b368'
        stroke='#141414'
        strokeWidth='4'
        strokeLinejoin='round'
      />
      <circle
        cx='60'
        cy='60'
        r='30'
        fill='#f2eee3'
        stroke='#141414'
        strokeWidth='4'
      />
    </svg>
    <span className={css.badgeLabel}>{label}</span>
  </span>
)

export const CoverPlate = () => (
  <div className={css.cover}>
    <span className={`${css.blinkChip} ${css.coverStar}`} aria-hidden='true'>
      3 DAYS ONLY!
    </span>
    <header className={css.coverMast}>
      <span className={css.logo}>ODD•ORDINARY</span>
      <span className={css.issueChip}>PROGRAMME Nº1</span>
      <span className={css.dateChip}>AUG 20—22</span>
    </header>
    <div className={css.coverBody}>
      <h1 className={css.coverStack}>
        <span className={`${css.coverWord} ${css.wordPink}`}>REJECT!</span>
        <span className={`${css.coverWord} ${css.wordYellow}`}>DEFAULT!</span>
        <span className={`${css.coverWord} ${css.wordBlue}`}>DESIGN!</span>
      </h1>
      <div className={css.coverSide}>
        <Badge label='Nº1' className={css.coverBadge} />
        <p className={css.coverCopy}>
          every border is 3px. every shadow is a solid block. nothing blurs,
          nothing fades, nothing apologizes.
        </p>
        <span className={css.barcode} aria-hidden='true' />
        <span className={css.barcodeNote}>SCAN FOR NOTHING</span>
        <div className={css.indexBox}>
          <h2 className={css.indexTitle}>IN THIS ISSUE</h2>
          <ul className={css.indexList}>
            <li>
              <strong>2</strong> THE TOYS — six working controls
            </li>
            <li>
              <strong>3</strong> THE PROGRAMME — filter it yourself
            </li>
            <li>
              <strong>4</strong> TICKETS — capitalism, loudly
            </li>
          </ul>
        </div>
      </div>
    </div>
    <p className={css.coverLoud}>LOUD!</p>
    <p className={css.venueBar}>{VENUE}</p>
  </div>
)

type RsvpCellProps = { going: number; onRsvp: () => void }

export const RsvpCell = ({ going, onRsvp }: RsvpCellProps) => (
  <div className={`${css.cell} ${css.rsvp}`}>
    <h3 className={css.cellTitle}>RSVP</h3>
    <button type='button' className={css.btn3d} onClick={onRsvp}>
      COUNT ME IN
    </button>
    <p className={css.count}>
      <strong>{going}</strong> going
    </p>
  </div>
)

type ModeCellProps = { oddinary: boolean; onToggle: () => void }

export const ModeCell = ({ oddinary, onToggle }: ModeCellProps) => (
  <div className={`${css.cell} ${css.mode}`}>
    <h3 className={css.cellTitle}>MODE</h3>
    <button
      type='button'
      role='switch'
      aria-checked={oddinary}
      className={css.switch}
      onClick={onToggle}
    >
      <span className={css.knob} />
    </button>
    <p className={css.modeLabel}>{oddinary ? 'ODDINARY' : 'ORDINARY'}</p>
  </div>
)

type HypeCellProps = { hype: number; onLess: () => void; onMore: () => void }

export const HypeCell = ({ hype, onLess, onMore }: HypeCellProps) => (
  <div className={`${css.cell} ${css.hype}`}>
    <h3 className={css.cellTitle}>
      HYPE METER <span className={css.liveChip}>LIVE!</span>
    </h3>
    <div className={css.hypeRow}>
      <button
        type='button'
        className={`${css.btn3d} ${css.step}`}
        aria-label='Less hype'
        onClick={onLess}
      >
        −
      </button>
      <span className={css.hypeValue}>{hype}</span>
      <button
        type='button'
        className={`${css.btn3d} ${css.step}`}
        aria-label='More hype'
        onClick={onMore}
      >
        +
      </button>
    </div>
    <div className={css.meter} role='img' aria-label={`Hype ${hype} of 10`}>
      <div className={css.meterFill} style={{ width: `${hype * 10}%` }} />
    </div>
  </div>
)

type AuditCellProps = { checked: boolean[]; onToggle: (index: number) => void }

export const AuditCell = ({ checked, onToggle }: AuditCellProps) => (
  <div className={`${css.cell} ${css.audit}`}>
    <h3 className={css.cellTitle}>AUDIT! YOUR! DECISIONS!</h3>
    <ul className={css.auditList}>
      {AUDIT_ITEMS.map((item, i) => (
        <li key={item}>
          <label className={css.check}>
            <input
              type='checkbox'
              className={css.checkInput}
              checked={checked[i]}
              onChange={() => onToggle(i)}
            />
            <span className={css.checkBox} aria-hidden='true'>
              {checked[i] ? '✗' : ''}
            </span>
            <span className={checked[i] ? css.checkDone : undefined}>
              {item}
            </span>
          </label>
        </li>
      ))}
    </ul>
  </div>
)

type ShoutCellProps = { slogan: string; stamp: number; onShout: () => void }

export const ShoutCell = ({ slogan, stamp, onShout }: ShoutCellProps) => (
  <div className={`${css.cell} ${css.shout}`}>
    <p key={stamp} className={css.slogan}>
      {slogan}
    </p>
    <button type='button' className={css.btn3d} onClick={onShout}>
      MAKE IT LOUDER
    </button>
  </div>
)

export const TicketCell = () => (
  <div className={`${css.cell} ${css.ticket}`}>
    <span className={css.ticketAdmit}>ADMIT ∞</span>
    <span className={css.ticketBars} aria-hidden='true' />
    <span className={css.ticketNote}>
      non-transferable. extremely transferable.
    </span>
  </div>
)

type ProgrammePlateProps = {
  axes: Axes
  onAxis: (key: keyof Axes, option: string) => void
}

const ANNOUNCED = SCHEDULE.filter((row) => row.act).length

export const ProgrammePlate = ({ axes, onAxis }: ProgrammePlateProps) => {
  const rows = SCHEDULE.filter((row) => matches(row, axes))
  return (
    <div className={css.programme}>
      <div className={css.programmeMain}>
        <h2 className={css.plateTitle}>
          <span className={css.plateKicker}>THE!</span>
          PROGRAMME!
        </h2>
        <div className={css.axes}>
          {AXES.map((axis) => (
            <div key={axis.key} className={css.axis}>
              <span className={css.axisLabel}>{axis.label}</span>
              {axis.options.map((option) => (
                <button
                  key={option}
                  type='button'
                  className={css.axisChip}
                  data-on={axes[axis.key] === option ? 'true' : undefined}
                  onClick={() => onAxis(axis.key, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className={css.scheduleWrap}>
          <span className={`${css.blinkChip} ${css.slotsChip}`}>
            3 SLOTS OPEN!
          </span>
          <table className={css.schedule}>
            <thead>
              <tr>
                <th>DAY</th>
                <th>TIME</th>
                <th>ACT</th>
                <th>ROOM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.day}-${row.time}`}
                  data-tba={row.act ? undefined : 'true'}
                >
                  <td>{row.day}</td>
                  <td>{row.time}</td>
                  <td className={css.scheduleAct}>
                    {row.act || 'TO BE ANNOUNCED'}
                  </td>
                  <td>{row.room}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className={css.emptyCell}>
                    NOTHING! MATCHES! LOOSEN! UP!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={css.fillRow}>
          <span className={css.fillLabel}>
            {ANNOUNCED} / {SCHEDULE.length} ANNOUNCED
          </span>
          <div className={css.meter}>
            <div
              className={css.meterFill}
              style={{ width: `${(ANNOUNCED / SCHEDULE.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <aside className={css.programmeSide}>
        <p className={css.sideNote}>
          three acts unannounced. the programme publishes as it fills.
        </p>
        <div className={css.rulesBox}>
          <h3 className={css.rulesTitle}>HOUSE RULES</h3>
          <ol className={css.rulesList}>
            {HOUSE_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </div>
        <Badge label='TBA' className={css.programmeBadge} />
      </aside>
    </div>
  )
}

type TicketsPlateProps = { going: number; onBuy: () => void }

export const TicketsPlate = ({ going, onBuy }: TicketsPlateProps) => (
  <div className={css.tickets}>
    <header className={css.ticketsHead}>
      <h2 className={css.plateTitle}>TICKETS!</h2>
      <Badge label='BUY!' className={css.buyBadge} />
      <span className={css.goingChip}>
        <strong>{going}</strong> GOING
      </span>
    </header>
    <div className={css.tierRow}>
      {TIERS.map((tier) => (
        <div key={tier.id} className={css.tier} data-tier={tier.id}>
          <span className={css.tierName}>{tier.name}</span>
          <span className={css.tierPrice}>{tier.price}</span>
          <ul className={css.tierPerks}>
            {tier.perks.map((perk) => (
              <li key={perk}>+ {perk}</li>
            ))}
          </ul>
          <button type='button' className={css.btn3d} onClick={onBuy}>
            GET IT
          </button>
        </div>
      ))}
    </div>
    <p className={css.tierNote}>
      every purchase adds one to the RSVP counter.{' '}
      <em className={css.capsBlink}>capitalism!</em>
    </p>
    <p className={css.manifesto}>
      neubrutalism: <em>web brutalism with candy.</em> flat fills, hard 8px
      offsets, borders that admit they are borders. the shadow never blurs
      because <mark>the sun here is a rectangle.</mark>
    </p>
  </div>
)
