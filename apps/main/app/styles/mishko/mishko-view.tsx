'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import { prefersQuietFx } from 'services/theme'
import {
  createMeltEngine,
  type MeltEngine,
  type MeltPalette,
  PALETTES,
} from './melt-gl'
import css from './mishko.module.css'

const PRESETS = [
  { phrase: 'KEEP GOING', gothic: false },
  { phrase: "DON'T GIVE UP", gothic: false },
  { phrase: 'COME BACK', gothic: false },
  { phrase: 'believe', gothic: true },
]

const SLUG_RE = /[^a-z0-9]+/g

const pad2 = (value: number) => `${value}`.padStart(2, '0')

type MishkoViewProps = { fontVars: string }

const MishkoView = ({ fontVars }: MishkoViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const gothicProbeRef = useRef<HTMLSpanElement>(null)
  const engineRef = useRef<MeltEngine | null>(null)
  const [phrase, setPhrase] = useState('KEEP GOING')
  const [gothic, setGothic] = useState(false)
  const [palette, setPalette] = useState<MeltPalette>('inferno')
  const [draft, setDraft] = useState('')
  const [edition, setEdition] = useState(1)
  const [stamp, setStamp] = useState('··|··|····')

  useEffect(() => {
    const now = new Date()
    setStamp(
      `${pad2(now.getDate())}|${pad2(now.getMonth() + 1)}|${now.getFullYear()}`,
    )
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const probe = probeRef.current
    const gothicProbe = gothicProbeRef.current
    if (!canvas || !probe || !gothicProbe) return
    const engine = createMeltEngine(
      canvas,
      {
        display: getComputedStyle(probe).fontFamily,
        gothic: getComputedStyle(gothicProbe).fontFamily,
      },
      prefersQuietFx(),
    )
    engineRef.current = engine
    return () => {
      engine?.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setPhrase(phrase, gothic)
  }, [phrase, gothic])

  useEffect(() => {
    engineRef.current?.setPalette(palette)
  }, [palette])

  const print = (nextPhrase: string, nextGothic: boolean) => {
    setPhrase(nextPhrase)
    setGothic(nextGothic)
    setEdition((n) => n + 1)
  }

  const submitDraft = (event: React.FormEvent) => {
    event.preventDefault()
    const clean = draft.trim()
    if (!clean) return
    print(clean.toUpperCase(), false)
    setDraft('')
  }

  const download = () => {
    const url = engineRef.current?.snapshot()
    if (!url) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `melt-${phrase.toLowerCase().replace(SLUG_RE, '-')}.png`
    anchor.click()
  }

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div
        className={css.stage}
        data-dark={PALETTES[palette].dark ? 'true' : undefined}
      >
        <canvas
          ref={canvasRef}
          className={css.canvas}
          aria-label={`Melted typography poster reading “${phrase}”`}
        />
        <span
          ref={probeRef}
          className={`${css.probe} ${css.probeHeavy}`}
          aria-hidden='true'
        >
          Aa
        </span>
        <span
          ref={gothicProbeRef}
          className={`${css.probe} ${css.probeGothic}`}
          aria-hidden='true'
        >
          Aa
        </span>

        <header className={css.caption}>
          <p>SOSPEDRA PRESS</p>
          <p>TYPOGRAPHY POSTER Nº{`${edition}`.padStart(3, '0')}</p>
          <p>
            {stamp} — “{phrase}”
          </p>
        </header>

        <div className={css.backTag}>
          <Link url='/styles'>◀ styles</Link>
        </div>

        <p className={css.hint}>rub the poster — heat melts the ink</p>

        <div className={css.deck}>
          <div className={css.row}>
            {PRESETS.map((preset) => (
              <button
                key={preset.phrase}
                type='button'
                className={css.chip}
                data-active={preset.phrase === phrase ? 'true' : undefined}
                data-gothic={preset.gothic ? 'true' : undefined}
                onClick={() => print(preset.phrase, preset.gothic)}
              >
                {preset.phrase}
              </button>
            ))}
          </div>
          <form className={css.row} onSubmit={submitDraft}>
            <input
              className={css.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder='your own words…'
              maxLength={26}
              aria-label='Custom poster phrase'
            />
            <button type='submit' className={css.chip}>
              PRINT IT
            </button>
          </form>
          <div className={css.row}>
            {(Object.keys(PALETTES) as MeltPalette[]).map((key) => (
              <button
                key={key}
                type='button'
                className={`${css.chip} ${css.swatchChip}`}
                data-active={key === palette ? 'true' : undefined}
                onClick={() => setPalette(key)}
              >
                <span
                  className={css.swatch}
                  style={{
                    background: `linear-gradient(90deg, ${PALETTES[key].stops.join(',')})`,
                  }}
                  aria-hidden='true'
                />
                {key}
              </button>
            ))}
            <button
              type='button'
              className={`${css.chip} ${css.saveChip}`}
              onClick={download}
            >
              ↓ SAVE PNG
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default MishkoView
