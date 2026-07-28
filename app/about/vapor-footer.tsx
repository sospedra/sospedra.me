import css from './about.module.css'

const GHOST_SOLID_AREAS = [
  'top0',
  'top1',
  'top2',
  'top3',
  'top4',
  'st0',
  'st1',
  'st2',
  'st3',
  'st4',
  'st5',
] as const

const GHOST_FEET = [
  { area: 'an1', phase: 0 },
  { area: 'an2', phase: 1 },
  { area: 'an3', phase: 1 },
  { area: 'an4', phase: 1 },
  { area: 'an6', phase: 0 },
  { area: 'an7', phase: 0 },
  { area: 'an8', phase: 0 },
  { area: 'an9', phase: 1 },
  { area: 'an10', phase: 1 },
  { area: 'an11', phase: 0 },
  { area: 'an12', phase: 0 },
  { area: 'an13', phase: 0 },
  { area: 'an15', phase: 1 },
  { area: 'an16', phase: 1 },
  { area: 'an17', phase: 1 },
  { area: 'an18', phase: 0 },
] as const

// Adapted from BlackisPlay's MIT-licensed Uiverse Pac-Man Ghost Loader.
// Full notice: THIRD_PARTY_NOTICES.md.
function PixelGhost() {
  return (
    <span aria-hidden='true' className={css.pixelGhost}>
      <span className={css.pixelGhostBody}>
        <span className={css.pixelGhostEye} />
        <span className={`${css.pixelGhostEye} ${css.pixelGhostEyeRight}`} />
        <span className={css.pixelGhostPupil} />
        <span
          className={`${css.pixelGhostPupil} ${css.pixelGhostPupilRight}`}
        />
        {GHOST_SOLID_AREAS.map((area) => (
          <span
            className={css.pixelGhostSolid}
            key={area}
            style={{ gridArea: area }}
          />
        ))}
        {GHOST_FEET.map(({ area, phase }) => (
          <span
            className={phase === 0 ? css.pixelGhostFootA : css.pixelGhostFootB}
            key={area}
            style={{ gridArea: area }}
          />
        ))}
      </span>
      <span className={css.pixelGhostShadow} />
    </span>
  )
}

export default function VaporFooter() {
  return (
    <div className={css.vapor} aria-hidden='true'>
      <span className={css.vaporSun} />
      <span className={css.vaporGrid} />
      <PixelGhost />
      <svg
        aria-hidden='true'
        className={css.vaporScene}
        viewBox='0 0 1200 240'
        preserveAspectRatio='xMidYMax slice'
        xmlns='http://www.w3.org/2000/svg'
      >
        <g className={css.vaporStars}>
          <path d='M180 40 h8 M184 36 v8' />
          <path d='M260 84 h8 M264 80 v8' />
          <path d='M420 30 h8 M424 26 v8' />
          <path d='M760 52 h8 M764 48 v8' />
          <path d='M930 26 h8 M934 22 v8' />
          <path d='M1020 70 h8 M1024 66 v8' />
          <circle cx='90' cy='60' r='1.5' />
          <circle cx='350' cy='96' r='1.5' />
          <circle cx='820' cy='90' r='1.5' />
          <circle cx='1160' cy='40' r='1.5' />
        </g>
        <g className={css.vaporPlanet}>
          <circle cx='300' cy='58' r='9' />
          <ellipse
            cx='300'
            cy='59'
            rx='16'
            ry='4'
            transform='rotate(-16 300 59)'
          />
        </g>
        <g className={css.vaporComet}>
          <path d='M880 34 L936 22' />
          <path d='M936 22 h6 M939 19 v6' />
        </g>
        <g className={css.vaporPalms}>
          <path d='M1080 240 Q1072 190 1082 150' />
          <path d='M1082 150 Q1102 138 1122 146 M1082 150 Q1096 128 1112 118 M1082 150 Q1078 126 1076 112 M1082 150 Q1062 130 1046 122 M1082 150 Q1066 142 1042 148' />
          <circle cx='1088' cy='154' r='3' />
          <path d='M60 240 Q68 202 62 176' />
          <path d='M62 176 Q76 166 90 172 M62 176 Q72 158 84 152 M62 176 Q58 156 60 146 M62 176 Q46 160 36 156 M62 176 Q50 170 34 176' />
        </g>
      </svg>
    </div>
  )
}
