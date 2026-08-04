import type { Ref } from 'react'
import type { LifeState } from './engine'
import { formatCount, padGeneration } from './life-instruments'
import css from './preset-rail.module.css'
import {
  type InteractiveLifePreset,
  LIFE_PRESETS,
  type LifePreset,
} from './presets'
import railPreset from './rail-preset.module.css'

const RailPresetBody = ({
  index,
  preset,
}: {
  index: number
  preset: LifePreset
}) => (
  <>
    <span className={railPreset.railPresetIndex}>
      {String(index + 1).padStart(2, '0')}
    </span>
    <span className={railPreset.railPresetCopy}>
      <strong>{preset.title}</strong>
      <small>{preset.family}</small>
    </span>
    <span className={railPreset.railPresetState} aria-hidden='true' />
  </>
)

export const PresetRail = ({
  loadPreset,
  railRef,
  state,
}: {
  loadPreset: (preset: InteractiveLifePreset) => void
  railRef: Ref<HTMLElement>
  state: LifeState
}) => (
  <aside
    id='preset-rail'
    ref={railRef}
    className={`${css.presetRail} ${railPreset.presetRail}`}
    aria-labelledby='preset-rail-title'
  >
    <header>
      <span>Pattern bank · {LIFE_PRESETS.length}</span>
      <strong id='preset-rail-title'>Preset library</strong>
      <small>Scroll / press to load</small>
    </header>
    <ol>
      {LIFE_PRESETS.map((preset, index) => {
        const active =
          preset.kind === 'interactive' && state.presetId === preset.id

        return (
          <li key={preset.id} data-active={active} data-kind={preset.kind}>
            {preset.kind === 'interactive' ? (
              <button
                type='button'
                className={railPreset.railPreset}
                aria-current={active ? 'true' : undefined}
                data-life-sfx='cartridge'
                data-no-press-pulse
                onClick={() => loadPreset(preset)}
              >
                <RailPresetBody index={index} preset={preset} />
              </button>
            ) : (
              <a
                className={railPreset.railPreset}
                data-life-sfx='cartridge'
                data-no-press-pulse
                href={preset.sourceHref}
                aria-label={`${preset.title}. Open reference dossier`}
                target='_blank'
                rel='noreferrer'
              >
                <RailPresetBody index={index} preset={preset} />
              </a>
            )}
          </li>
        )
      })}
    </ol>
    <footer className={css.railInstrumentRow} aria-hidden='true'>
      <span>
        <i /> Gen <b>{padGeneration(state.generation, 3)}</b>
      </span>
      <span>
        Pop <b>{formatCount(state.cells.size)}</b>
      </span>
      <span>B3 / S23</span>
    </footer>
  </aside>
)
