import cn from 'clsx'
import css from './setup-diagram.module.css'

type DiagramVariant = 'commission' | 'channel' | 'recovery'

type SetupDiagramProps = {
  variant: DiagramVariant
  number: string
  title: string
  caption: string
  className?: string
}

const CommissionDiagram = () => (
  <svg
    className={css.blueprint}
    viewBox='0 0 720 340'
    role='img'
    aria-labelledby='commission-title'
    aria-describedby='commission-description'
    shapeRendering='geometricPrecision'
  >
    <title id='commission-title'>Commissioning the RS-91 interface unit</title>
    <desc id='commission-description'>
      Insert a clear objective card, connect the context lead, then engage the
      ethical interlock before operation.
    </desc>
    <defs>
      <pattern
        id='commission-grid'
        width='24'
        height='24'
        patternUnits='userSpaceOnUse'
      >
        <path className={css.gridLine} d='M24 0H0V24' />
      </pattern>
    </defs>

    <rect
      className={css.grid}
      width='720'
      height='340'
      fill='url(#commission-grid)'
    />
    <path className={css.dimension} d='M553 42h14m-14 244h14m-7-244v244' />
    <path
      className={css.dimensionTick}
      d='m560 42 5 9m-5-9-5 9m5 235 5-9m-5 9-5-9'
    />
    <text
      className={css.dimensionLabel}
      textAnchor='middle'
      transform='rotate(-90 574 164)'
      x='574'
      y='164'
    >
      430 mm / CLEARANCE
    </text>

    <g className={css.machine}>
      <path className={css.surface} d='M255 69 315 42h230l-55 27Z' />
      <path className={css.sideSurface} d='m490 69 55-27v218l-55 26Z' />
      <rect className={css.surface} x='255' y='69' width='235' height='217' />
      <path className={css.detail} d='M278 91h188v88H278zm12 12h164v53H290z' />
      <path
        className={css.screenTrace}
        d='m302 133 18-12 17 21 20-37 21 48 18-32 18 13 17-23'
      />
      <path className={css.detail} d='M278 193h188M278 238h188' />
      <circle className={css.control} cx='307' cy='215' r='11' />
      <circle className={css.control} cx='350' cy='215' r='11' />
      <rect
        className={css.detail}
        x='390'
        y='204'
        width='61'
        height='22'
        rx='2'
      />
      <path className={css.detail} d='M409 253h39v20h-39zM422 253v-12h13v12' />
      <path
        className={css.detail}
        d='m498 100 39-19m-39 42 39-19m-39 115 39-19'
      />
      <circle className={css.port} cx='255' cy='215' r='8' />
      <text className={css.svgLabel} x='285' y='274'>
        RS-91 / HUMAN TYPE 01
      </text>
    </g>

    <g>
      <path className={css.card} d='M325 14h116v74H325z' />
      <path className={css.detail} d='M341 31h63m-63 13h83m-83 13h49' />
      <path className={css.cardTab} d='M365 70h37v18h-37z' />
      <path
        className={css.actionArrow}
        d='M383 21c3 15-2 29 1 42 2 9-2 16 0 27'
      />
      <path className={css.actionArrow} d='m374 78 10 13 8-14' />
      <circle className={css.callout} cx='301' cy='30' r='16' />
      <text className={css.calloutText} x='301' y='35' textAnchor='middle'>
        1
      </text>
    </g>

    <g>
      <path className={css.contextPack} d='M37 149h111v89H37z' />
      <path className={css.detail} d='M52 165h77m-77 14h58m-58 14h68' />
      <path className={css.detail} d='m148 194 35 21h37' />
      <path className={css.cable} d='M148 215h62c19 0 22 0 37 0' />
      <path
        className={css.actionArrow}
        d='M173 178c16-2 33 3 46 10 13 7 23 13 32 21'
      />
      <path className={css.actionArrow} d='m237 205 14 4-5-14' />
      <circle className={css.callout} cx='62' cy='126' r='16' />
      <text className={css.calloutText} x='62' y='131' textAnchor='middle'>
        2
      </text>
      <text className={css.svgLabel} x='48' y='229'>
        CONTEXT / EVIDENCE
      </text>
    </g>

    <g>
      <path className={css.interlock} d='M594 207h79v72h-79z' />
      <circle className={css.detail} cx='633' cy='237' r='17' />
      <path className={css.detail} d='m633 220 10 17-10 18-10-18Z' />
      <path className={css.detail} d='M633 255v16' />
      <path
        className={css.actionArrow}
        d='M632 166c-2 12 3 21 1 31-1 6 1 11 1 16'
      />
      <path className={css.actionArrow} d='m625 202 9 13 8-13' />
      <circle className={css.callout} cx='633' cy='139' r='16' />
      <text className={css.calloutText} x='633' y='144' textAnchor='middle'>
        3
      </text>
      <text className={css.svgLabel} x='575' y='301'>
        ETHICAL INTERLOCK
      </text>
    </g>

    <path className={css.floorLine} d='M14 310h692' />
    <path className={css.floorDetail} d='m234 310 31-24h258l41 24' />
  </svg>
)

const ChannelDiagram = () => (
  <svg
    className={css.blueprint}
    viewBox='0 0 360 250'
    role='img'
    aria-labelledby='channel-title'
    aria-describedby='channel-description'
    shapeRendering='geometricPrecision'
  >
    <title id='channel-title'>Asynchronous communication channel</title>
    <desc id='channel-description'>
      Two terminals exchange a concise message through an asynchronous link. A
      crossed-out handset indicates that a live call is not the default.
    </desc>
    <path className={css.dimension} d='M18 218h324' />
    <g>
      <path className={css.surface} d='M25 89h85v119H25z' />
      <path className={css.detail} d='M36 101h63v51H36zm12 65h39m-39 12h26' />
      <circle className={css.control} cx='91' cy='180' r='5' />
      <text className={css.svgLabel} x='49' y='198'>
        A / TX
      </text>
    </g>
    <g>
      <path className={css.surface} d='M250 89h85v119h-85z' />
      <path className={css.detail} d='M261 101h63v51h-63zm12 65h39m-39 12h26' />
      <circle className={css.control} cx='316' cy='180' r='5' />
      <text className={css.svgLabel} x='275' y='198'>
        B / RX
      </text>
    </g>

    <path
      className={css.actionArrow}
      d='M116 132c21-4 41 5 62 2 20-3 41 1 61-2'
    />
    <path className={css.actionArrow} d='m228 123 13 9-14 9' />
    <rect className={css.packet} x='132' y='112' width='28' height='20' />
    <rect className={css.packet} x='174' y='112' width='28' height='20' />
    <path className={css.detail} d='m135 115 11 8 11-8m20 0 11 8 11-8' />

    <circle className={css.clock} cx='180' cy='54' r='31' />
    <path className={css.detail} d='M180 31v24l17 10' />
    <path className={css.calibration} d='M170 13h20m-10-8v17' />
    <text className={css.svgLabel} x='180' y='96' textAnchor='middle'>
      ASYNC / 40 MIN
    </text>

    <g transform='translate(299 19)'>
      <path
        className={css.prohibitionIcon}
        d='M4 9c7-7 15-7 22 0l-6 7c-4-3-7-3-10 0Z'
      />
      <circle className={css.prohibition} cx='15' cy='15' r='22' />
      <path className={css.prohibition} d='m0 0 30 30' />
    </g>
    <path className={css.cable} d='M110 193c38 32 102 32 140 0' />
  </svg>
)

const RecoveryDiagram = () => (
  <svg
    className={css.blueprint}
    viewBox='0 0 360 250'
    role='img'
    aria-labelledby='recovery-title'
    aria-describedby='recovery-description'
    shapeRendering='geometricPrecision'
  >
    <title id='recovery-title'>Recovery route to the home position</title>
    <desc id='recovery-description'>
      A failed branch is crossed out. A large return arrow routes the operator
      to the home position.
    </desc>
    <defs>
      <pattern
        id='recovery-grid'
        width='22'
        height='22'
        patternUnits='userSpaceOnUse'
      >
        <path className={css.gridLine} d='M22 0H0V22' />
      </pattern>
    </defs>

    <rect
      className={css.grid}
      x='11'
      y='10'
      width='338'
      height='216'
      fill='url(#recovery-grid)'
    />
    <path className={css.mapWall} d='M20 211h79v-48h56v-48h58V66h128' />
    <path className={css.mapWall} d='M20 180h46v-52h55V79h60V33h160' />
    <path
      className={css.failedRoute}
      d='M47 194c22-36 49-48 85-50 31-2 51-19 60-50'
    />
    <path className={css.prohibition} d='m169 69 41 41m0-41-41 41' />

    <path
      className={css.actionArrow}
      d='M52 194c30 17 76 32 120 24 46-8 71-31 85-63'
    />
    <path className={css.actionArrow} d='m245 162 12-7 2 14' />
    <g transform='translate(277 39)'>
      <path className={css.homeIcon} d='m0 38 31-28 31 28v38H0Z' />
      <path className={css.detail} d='M22 76V50h18v26M8 34h46' />
      <text className={css.svgLabel} x='31' y='94' textAnchor='middle'>
        HOME / RESET
      </text>
    </g>
    <g transform='translate(27 175)'>
      <rect className={css.surface} width='45' height='39' />
      <path className={css.detail} d='M9 10h27M9 20h17' />
      <circle className={css.control} cx='35' cy='29' r='4' />
    </g>
    <path className={css.calibration} d='M25 29h34m-17-17v34' />
    <text className={css.dimensionLabel} x='67' y='33'>
      N / FIELD ROUTE
    </text>
  </svg>
)

const diagrams = {
  commission: CommissionDiagram,
  channel: ChannelDiagram,
  recovery: RecoveryDiagram,
}

export default function SetupDiagram({
  variant,
  number,
  title,
  caption,
  className,
}: SetupDiagramProps) {
  const Diagram = diagrams[variant]

  return (
    <figure className={cn(css.figure, css[variant], className)}>
      <div className={css.drawing}>
        <Diagram />
      </div>
      <figcaption>
        <span className={css.figureNumber}>FIG. {number}</span>
        <span>
          <strong>{title}</strong>
          {caption}
        </span>
      </figcaption>
    </figure>
  )
}
