'use client'

import type React from 'react'
import { useImperativeHandle, useRef } from 'react'
import type { ArmPose, DomeHandle } from './choreography'
import css from './dome.module.css'
import type { JukeRecord } from './records'

const SLAT_COUNT = 21
const TAGS = ['--tag1', '--tag2', '--tag3', '--tag4', '--tag5'] as const

type Slat = { id: string; height: number; tag: string }

const MAGAZINE: Slat[] = Array.from({ length: SLAT_COUNT }, (_, index) => {
  const k = (index - (SLAT_COUNT - 1) / 2) / ((SLAT_COUNT - 1) / 2)
  return {
    id: `slat-${index}`,
    height: 56 + 36 * Math.cos(k * 1.25),
    tag: TAGS[index % TAGS.length],
  }
})

export default function Dome({
  platter,
  armPose,
  lampText,
  ref,
}: {
  platter: JukeRecord
  armPose: ArmPose
  lampText: string
  ref?: React.Ref<DomeHandle>
}) {
  const carrierRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const magazineRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(ref, () => ({
    carrier: carrierRef.current as HTMLDivElement,
    glare: glareRef.current as HTMLDivElement,
    magazine: magazineRef.current as HTMLDivElement,
    scope: scopeRef.current as HTMLCanvasElement,
  }))

  return (
    <section className={css.dome}>
      <h1 className={css.marquee}>
        SIDE PROJECTS <span>SELECT·O·MATIC</span>
      </h1>
      <div className={css.domeGlass} aria-hidden>
        <div className={css.mag} ref={magazineRef}>
          {MAGAZINE.map((slat) => (
            <div
              key={slat.id}
              className={css.rec}
              style={{ height: `${slat.height}%` }}
            >
              <i style={{ background: `var(${slat.tag})` }} />
            </div>
          ))}
        </div>
        <div className={css.deck}>
          <div className={css.platter}>
            <div className={css.carrier} ref={carrierRef}>
              <div className={css.vinyl}>
                <div className={css.vlabel}>{platter.title.toUpperCase()}</div>
              </div>
            </div>
            <div className={css.glare} ref={glareRef} />
          </div>
          <div className={css.tonearm} data-pose={armPose}>
            <div className={css.arm}>
              <div className={css.head} />
            </div>
            <div className={css.pivot} />
          </div>
        </div>
        <canvas className={css.scope} ref={scopeRef} />
        <div className={css.glass} />
      </div>
      <p className={css.lamp} role='status'>
        {lampText}
      </p>
    </section>
  )
}
