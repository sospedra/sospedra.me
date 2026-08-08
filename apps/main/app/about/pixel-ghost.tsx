import css from './pixel-ghost.module.css'

const SOLID_AREAS = [
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

const FEET = [
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

export default function PixelGhost() {
  return (
    <span aria-hidden='true' className={css.body}>
      <span className={css.eye} />
      <span className={`${css.eye} ${css.eyeRight}`} />
      <span className={css.pupil} />
      <span className={`${css.pupil} ${css.pupilRight}`} />
      {SOLID_AREAS.map((area) => (
        <span className={css.solid} key={area} style={{ gridArea: area }} />
      ))}
      {FEET.map(({ area, phase }) => (
        <span
          className={phase === 0 ? css.footA : css.footB}
          key={area}
          style={{ gridArea: area }}
        />
      ))}
    </span>
  )
}
