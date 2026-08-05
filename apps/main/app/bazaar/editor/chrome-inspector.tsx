'use client'

import { useStoreSelector } from 'services/external-store'
import { ARCH, regimeAt } from '../decor'
import { SEP_SKINS, WALL_SKINS } from './catalog-data'
import {
  beginChromeGesture,
  type ChromePatch,
  chromeStore,
  editChrome,
  endChromeGesture,
  exportChrome,
  resetChrome,
  writeChrome,
} from './chrome-store'
import css from './editor.module.css'
import { Scrub, Section } from './fields'
import { round2, stageSizeStore } from './store'
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

const movePatch = (x: number, y: number): ChromePatch => ({
  translate: x === 0 && y === 0 ? undefined : `${x}px ${y}px`,
})

const scalePatch = (sx: number, sy: number): ChromePatch => ({
  scale: sx === 1 && sy === 1 ? undefined : `${round2(sx)} ${round2(sy)}`,
})

const zPatch = (z: number): ChromePatch => ({
  zIndex: z === 0 ? undefined : String(z),
})

const brightPatch = (bright: number): ChromePatch => ({
  filter: bright === 1 ? undefined : `brightness(${bright})`,
})

const opacityPatch = (opacity: number): ChromePatch => ({
  opacity: String(opacity),
})

const displayPatch = (hidden: boolean): ChromePatch => ({
  display: hidden ? undefined : 'none',
})

const veilValue = (patch: ChromePatch, isWall: boolean) => {
  const parsed = Number.parseFloat(patch.opacity ?? '')
  if (Number.isFinite(parsed)) return parsed
  return isWall ? 0 : 1
}

const cycleSkin = (id: string, isWall: boolean, patch: ChromePatch) => {
  const list = isWall ? WALL_SKINS : SEP_SKINS
  const current = skinLabel(patch)
  const next = list[(list.indexOf(current as never) + 1) % list.length]
  if (isWall) editChrome(id, { wf: `${ARCH}/${next}.png` })
  else editChrome(id, { backgroundImage: `url("${ARCH}/${next}.png")` })
}

export default function ChromeInspector({ id }: { id: string }) {
  const regime = useStoreSelector(stageSizeStore, (size) => regimeAt(size.w))
  const patch =
    useStoreSelector(chromeStore, (map) => map[`${id}@${regime}`]) ?? {}
  const gesture = useGesture<ChromePatch>(
    (next) => writeChrome(id, next),
    (next) => editChrome(id, next),
    beginChromeGesture,
    endChromeGesture,
  )
  const isWall = id.startsWith('wall:')
  const skinnable = isWall || id.startsWith('sep:')
  const move = parseMove(patch.translate)
  const scale = parseScale(patch.scale)
  const hidden = patch.display === 'none'

  return (
    <>
      <div className={css.selHead}>
        <span className={css.selName}>
          <b>{id}</b>
          <small>
            chrome · edits scoped to {regime.toUpperCase()} · preview only, bake
            into css
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
          <Scrub
            label={isWall ? 'veil' : 'op'}
            value={veilValue(patch, isWall)}
            step={0.01}
            min={0}
            max={1}
            precision={2}
            onBegin={gesture.begin}
            onLive={(o) => gesture.live(opacityPatch(o))}
            onCommit={(o) => gesture.commit(opacityPatch(o))}
          />
        </div>
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
            reset {regime}
          </button>
          <button type='button' onClick={() => exportChrome()}>
            copy patch json
          </button>
        </div>
      </Section>
    </>
  )
}
