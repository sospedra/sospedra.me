'use client'

import { useStoreSelector } from 'services/external-store'
import { chromeKey, chromeScopeAt, SHADOW_DEFAULTS } from '../chrome'
import { ARCH } from '../decor'
import { STALLS } from '../stall-catalog'
import type { BazaarStallId } from '../stalls-manifest'
import { SEP_SKINS, WALL_SKINS } from './catalog-data'
import {
  beginChromeGesture,
  type ChromePatch,
  chromeStore,
  chromeTranslateOf,
  editChrome,
  endChromeGesture,
  exportChrome,
  resetChrome,
  writeChrome,
} from './chrome-store'
import css from './editor.module.css'
import { Scrub, Section } from './fields'
import { editEls } from './probe'
import { round2, stageSizeStore, swapStalls } from './store'
import { useGesture } from './use-gesture'

const parseNums = (raw: string | undefined) =>
  (raw ?? '')
    .replaceAll('px', '')
    .split(' ')
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part))

/* one translate value means y = 0; one scale value means y = x */
const parseMove = (raw: string | undefined) => {
  const [x = 0, y = 0] = parseNums(raw)
  return { x, y }
}

const parseScale = (raw: string | undefined) => {
  const [x = 1, y] = parseNums(raw)
  return { x, y: y ?? x }
}

const parseBright = (filter: string | undefined) => {
  const value = Number.parseFloat(filter?.slice('brightness('.length) ?? '')
  return Number.isFinite(value) ? value : 1
}

const skinLabel = (patch: ChromePatch) =>
  [...WALL_SKINS, ...SEP_SKINS].find((skin) =>
    (patch.wf ?? patch.backgroundImage ?? '').includes(skin),
  )

/* 0,0 stays explicit: dropping the key would fall back to a baked translate */
const movePatch = (x: number, y: number): ChromePatch => ({
  translate: `${x}px ${y}px`,
})

/* neutral values stay explicit: a dropped key falls back to the saved
   style layer, not to neutral */
const scalePatch = (sx: number, sy: number): ChromePatch => ({
  scale: `${round2(sx)} ${round2(sy)}`,
})

const zPatch = (z: number): ChromePatch => ({
  zIndex: String(z),
})

const brightPatch = (bright: number): ChromePatch => ({
  filter: `brightness(${bright})`,
})

const opacityPatch = (opacity: number): ChromePatch => ({
  opacity: String(opacity),
})

const displayPatch = (hidden: boolean): ChromePatch => ({
  display: hidden ? undefined : 'none',
})

/* 0 stays explicit: dropping the key would fall back to a baked --veil */
const veilPatch = (veil: number): ChromePatch => ({
  veil: String(veil),
})

const veilValue = (patch: ChromePatch, id: string) => {
  const parsed = Number.parseFloat(patch.veil ?? '')
  if (Number.isFinite(parsed)) return parsed
  const el = editEls(id).find((entry) => entry.offsetParent !== null)
  const baked = Number.parseFloat(
    el ? getComputedStyle(el).getPropertyValue('--veil') : '',
  )
  return Number.isFinite(baked) ? baked : 0
}

const opacityValue = (patch: ChromePatch) => {
  const parsed = Number.parseFloat(patch.opacity ?? '')
  return Number.isFinite(parsed) ? parsed : 1
}

/* the live skin resolves on the layer's background (var(--wf) included) */
const computedSkin = (id: string) => {
  const el = editEls(id).find((entry) => entry.offsetParent !== null)
  const source = el ? getComputedStyle(el).backgroundImage : ''
  return [...WALL_SKINS, ...SEP_SKINS].find((skin) => source.includes(skin))
}

const cycleSkin = (id: string, isWall: boolean, patch: ChromePatch) => {
  const list = isWall ? WALL_SKINS : SEP_SKINS
  const current = skinLabel(patch) ?? computedSkin(id)
  const next = list[(list.indexOf(current as never) + 1) % list.length]
  if (isWall) editChrome(id, { wf: `${ARCH}/${next}.png` })
  else editChrome(id, { backgroundImage: `url("${ARCH}/${next}.png")` })
}

type PatchGesture = {
  begin: () => void
  live: (patch: ChromePatch) => void
  commit: (patch: ChromePatch) => void
}

/* the third look knob: veil for WF layers, plain opacity elsewhere */
function AlphaScrub(props: {
  id: string
  veiled: boolean
  patch: ChromePatch
  gesture: PatchGesture
}) {
  const { id, veiled, patch, gesture } = props
  const toPatch = veiled ? veilPatch : opacityPatch
  return (
    <Scrub
      label={veiled ? 'veil' : 'op'}
      value={veiled ? veilValue(patch, id) : opacityValue(patch)}
      step={0.01}
      min={0}
      max={1}
      precision={2}
      onBegin={gesture.begin}
      onLive={(value) => gesture.live(toPatch(value))}
      onCommit={(value) => gesture.commit(toPatch(value))}
    />
  )
}

const shadowValue = (raw: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(raw ?? '')
  return Number.isFinite(parsed) ? parsed : fallback
}

type ShadowKnob = {
  label: string
  key: keyof ChromePatch
  fallback: number
  unit: '' | '%'
  step: number
  min: number
  max: number
  precision: number
}

/* op alpha · len gradient stop · h/y in su · in width inset (negative
   spreads past the stall); explicit values, dropping a key = default */
const SHADOW_KNOBS: ShadowKnob[] = [
  {
    label: 'op',
    key: 'shadowOp',
    fallback: SHADOW_DEFAULTS.op,
    unit: '',
    step: 0.01,
    min: 0,
    max: 1,
    precision: 2,
  },
  {
    label: 'len',
    key: 'shadowStop',
    fallback: SHADOW_DEFAULTS.stop,
    unit: '%',
    step: 1,
    min: 20,
    max: 100,
    precision: 0,
  },
  {
    label: 'h',
    key: 'shadowH',
    fallback: SHADOW_DEFAULTS.h,
    unit: '',
    step: 0.5,
    min: 2,
    max: 60,
    precision: 1,
  },
  {
    label: 'y',
    key: 'shadowY',
    fallback: SHADOW_DEFAULTS.y,
    unit: '',
    step: 0.5,
    min: -40,
    max: 80,
    precision: 1,
  },
  {
    label: 'in',
    key: 'shadowInset',
    fallback: SHADOW_DEFAULTS.inset,
    unit: '%',
    step: 1,
    min: -30,
    max: 45,
    precision: 0,
  },
]

function ShadowSection(props: { patch: ChromePatch; gesture: PatchGesture }) {
  const { patch, gesture } = props
  return (
    <Section title='shadow'>
      <div className={css.grid3}>
        {SHADOW_KNOBS.map((knob) => (
          <Scrub
            key={knob.key}
            label={knob.label}
            value={shadowValue(patch[knob.key], knob.fallback)}
            step={knob.step}
            min={knob.min}
            max={knob.max}
            precision={knob.precision}
            onBegin={gesture.begin}
            onLive={(value) =>
              gesture.live({ [knob.key]: `${value}${knob.unit}` })
            }
            onCommit={(value) =>
              gesture.commit({ [knob.key]: `${value}${knob.unit}` })
            }
          />
        ))}
      </div>
    </Section>
  )
}

const STALL_IDS = Object.keys(STALLS) as BazaarStallId[]

function SwapSection({ id }: { id: BazaarStallId }) {
  return (
    <Section title='swap slot with'>
      <div className={css.rowBtns}>
        {STALL_IDS.filter((other) => other !== id).map((other) => (
          <button
            key={other}
            type='button'
            onClick={() => swapStalls(id, other)}
          >
            {other}
          </button>
        ))}
      </div>
    </Section>
  )
}

export default function ChromeInspector({ id }: { id: string }) {
  const scope = useStoreSelector(stageSizeStore, (size) =>
    chromeScopeAt(size.w),
  )
  const patch =
    useStoreSelector(chromeStore, (map) => map[chromeKey(id, scope)]) ?? {}
  const gesture = useGesture<ChromePatch>(
    (next) => writeChrome(id, next),
    (next) => editChrome(id, next),
    beginChromeGesture,
    endChromeGesture,
  )
  const isWall = id.startsWith('wall:') || id.startsWith('mwall:')
  const veiled = isWall || id.startsWith('wfloor:')
  const skinnable = isWall || id.startsWith('sep:') || id.startsWith('msep:')
  const stall = id in STALLS ? (id as BazaarStallId) : null
  const move = parseMove(chromeTranslateOf(id))
  const scale = parseScale(patch.scale)

  return (
    <>
      <div className={css.selHead}>
        <span className={css.selName}>
          <b>{id}</b>
          <small>
            chrome · scoped to {scope === 'm' ? 'MOBILE' : 'DESKTOP (B·A·W)'} ·
            SAVE persists it
          </small>
        </span>
      </div>
      <Section title='offset px'>
        <div className={css.grid2}>
          <Scrub
            label='x'
            value={move.x}
            precision={0}
            step={1}
            onBegin={gesture.begin}
            onLive={(x) => gesture.live(movePatch(x, move.y))}
            onCommit={(x) => gesture.commit(movePatch(x, move.y))}
          />
          <Scrub
            label='y'
            value={move.y}
            precision={0}
            step={1}
            onBegin={gesture.begin}
            onLive={(y) => gesture.live(movePatch(move.x, y))}
            onCommit={(y) => gesture.commit(movePatch(move.x, y))}
          />
          <Scrub
            label='sx'
            value={scale.x}
            step={0.01}
            min={0.05}
            max={8}
            precision={2}
            onBegin={gesture.begin}
            onLive={(sx) => gesture.live(scalePatch(sx, scale.y))}
            onCommit={(sx) => gesture.commit(scalePatch(sx, scale.y))}
          />
          <Scrub
            label='sy'
            value={scale.y}
            step={0.01}
            min={0.05}
            max={8}
            precision={2}
            onBegin={gesture.begin}
            onLive={(sy) => gesture.live(scalePatch(scale.x, sy))}
            onCommit={(sy) => gesture.commit(scalePatch(scale.x, sy))}
          />
        </div>
      </Section>
      <Section title='look'>
        <div className={css.grid3}>
          <Scrub
            label='z'
            value={Number.parseInt(patch.zIndex ?? '', 10) || 0}
            precision={0}
            step={0.05}
            min={-6}
            max={60}
            onBegin={gesture.begin}
            onLive={(z) => gesture.live(zPatch(z))}
            onCommit={(z) => gesture.commit(zPatch(z))}
          />
          <Scrub
            label='brt'
            value={parseBright(patch.filter)}
            step={0.01}
            min={0.05}
            max={3}
            precision={2}
            onBegin={gesture.begin}
            onLive={(b) => gesture.live(brightPatch(b))}
            onCommit={(b) => gesture.commit(brightPatch(b))}
          />
          <AlphaScrub id={id} veiled={veiled} patch={patch} gesture={gesture} />
        </div>
        <ChromeActions
          id={id}
          patch={patch}
          isWall={isWall}
          skinnable={skinnable}
          scope={scope}
        />
      </Section>
      {stall && (
        <>
          <ShadowSection patch={patch} gesture={gesture} />
          <SwapSection id={stall} />
        </>
      )}
    </>
  )
}

function ChromeActions(props: {
  id: string
  patch: ChromePatch
  isWall: boolean
  skinnable: boolean
  scope: 'm' | 'd'
}) {
  const { id, patch, isWall, skinnable, scope } = props
  const hidden = patch.display === 'none'
  return (
    <div className={css.rowBtns} style={{ marginTop: 6 }}>
      {skinnable && (
        <button type='button' onClick={() => cycleSkin(id, isWall, patch)}>
          skin ▸ {skinLabel(patch) ?? 'base'}
        </button>
      )}
      <button
        type='button'
        aria-pressed={hidden}
        onClick={() => editChrome(id, displayPatch(hidden))}
      >
        {hidden ? 'show' : 'hide'}
      </button>
      <button type='button' onClick={() => resetChrome(id)}>
        reset {scope === 'm' ? 'mobile' : 'desktop'}
      </button>
      <button type='button' onClick={() => exportChrome()}>
        copy patch json
      </button>
    </div>
  )
}
