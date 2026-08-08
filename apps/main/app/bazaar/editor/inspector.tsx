'use client'

import { useStoreSelector } from 'services/external-store'
import {
  type DecorNode,
  GLOW_COLORS,
  isSpotKind,
  type Placement,
  REGIMES,
  type Regime,
  regimeAt,
  spriteSrc,
} from '../decor'
import { decorStore } from '../decor-store'
import ChromeInspector from './chrome-inspector'
import css from './editor.module.css'
import { CornerPad, Scrub, Section } from './fields'
import {
  anchorPickStore,
  beginGesture,
  chainRootHost,
  dropFork,
  duplicateNode,
  editNode,
  editPlacement,
  endGesture,
  forkRegime,
  isMobileOnlyNode,
  placementTarget,
  rehostNode,
  removeNode,
  selectionStore,
  setCorner,
  stageSizeStore,
  toggleRegime,
  writeNode,
  writePlacement,
} from './store'
import { useGesture } from './use-gesture'

const undefinedIf = <T,>(value: T, neutral: T) =>
  value === neutral ? undefined : value

function NodeHead({ node }: { node: DecorNode }) {
  return (
    <div className={css.selHead}>
      {isSpotKind(node.kind) ? (
        <span
          className={css.thumb}
          style={{ background: GLOW_COLORS[node.ref] }}
        />
      ) : (
        <img
          className={css.thumb}
          src={spriteSrc(node.kind, node.ref)}
          alt=''
        />
      )}
      <span className={css.selName}>
        <b>{node.ref}</b>
        <small>
          {node.id} · {node.kind} · {chainRootHost(node.id)}
        </small>
      </span>
    </div>
  )
}

function AnchorSection({ node }: { node: DecorNode }) {
  const picking = useStoreSelector(
    anchorPickStore,
    (value) => value === node.id,
  )
  const chained = node.host.startsWith('node:')
  return (
    <Section title='anchor'>
      <div className={css.rowBtns}>
        <button
          type='button'
          className={css.hostChip}
          data-picking={picking || undefined}
          onClick={() => anchorPickStore.set(picking ? null : node.id)}
        >
          {picking ? 'pick a target…' : node.host}
        </button>
        <CornerPad
          corner={node.corner}
          disabled={chained || node.over !== undefined}
          onPick={(corner) => setCorner(node.id, corner)}
        />
        {chained && (
          <button
            type='button'
            onClick={() => rehostNode(node.id, chainRootHost(node.id))}
          >
            de-chain
          </button>
        )}
      </div>
    </Section>
  )
}

function PlacementSection(props: { node: DecorNode; place: Placement }) {
  const { node, place } = props
  const gesture = useGesture<Partial<Placement>>(
    (patch) => writePlacement(node.id, patch),
    (patch) => editPlacement(node.id, patch),
    beginGesture,
    endGesture,
  )
  const spot = isSpotKind(node.kind)
  return (
    <Section title='placement'>
      <div className={css.grid2}>
        <Scrub
          label='x'
          value={place.x}
          onBegin={gesture.begin}
          onLive={(x) => gesture.live({ x })}
          onCommit={(x) => gesture.commit({ x })}
        />
        <Scrub
          label='y'
          value={place.y}
          onBegin={gesture.begin}
          onLive={(y) => gesture.live({ y })}
          onCommit={(y) => gesture.commit({ y })}
        />
        <Scrub
          label='h'
          value={place.h}
          min={2}
          onBegin={gesture.begin}
          onLive={(h) => gesture.live({ h })}
          onCommit={(h) => gesture.commit({ h })}
        />
        {spot && (
          <Scrub
            label='w'
            value={place.w ?? place.h}
            min={2}
            onBegin={gesture.begin}
            onLive={(w) => gesture.live({ w })}
            onCommit={(w) => gesture.commit({ w })}
          />
        )}
        {!spot && (
          <>
            <Scrub
              label='sx'
              value={place.sx ?? 1}
              step={0.01}
              min={0.05}
              max={8}
              precision={2}
              onBegin={gesture.begin}
              onLive={(sx) => gesture.live({ sx })}
              onCommit={(sx) => gesture.commit({ sx: undefinedIf(sx, 1) })}
            />
            <Scrub
              label='sy'
              value={place.sy ?? 1}
              step={0.01}
              min={0.05}
              max={8}
              precision={2}
              onBegin={gesture.begin}
              onLive={(sy) => gesture.live({ sy })}
              onCommit={(sy) => gesture.commit({ sy: undefinedIf(sy, 1) })}
            />
          </>
        )}
      </div>
    </Section>
  )
}

function LookSection({ node }: { node: DecorNode }) {
  const gesture = useGesture<Partial<DecorNode>>(
    (patch) => writeNode(node.id, patch),
    (patch) => editNode(node.id, patch),
    beginGesture,
    endGesture,
  )
  return (
    <Section title='look'>
      <div className={css.grid3}>
        <Scrub
          label='z'
          value={node.z}
          step={0.05}
          min={-6}
          max={40}
          precision={0}
          onBegin={gesture.begin}
          onLive={(z) => gesture.live({ z })}
          onCommit={(z) => gesture.commit({ z })}
        />
        <Scrub
          label='brt'
          value={node.bright ?? 1}
          step={0.01}
          min={0.05}
          max={3}
          precision={2}
          onBegin={gesture.begin}
          onLive={(bright) => gesture.live({ bright })}
          onCommit={(bright) =>
            gesture.commit({ bright: undefinedIf(bright, 1) })
          }
        />
        <Scrub
          label='op'
          value={node.opacity ?? 1}
          step={0.01}
          min={0}
          max={1}
          precision={2}
          onBegin={gesture.begin}
          onLive={(opacity) => gesture.live({ opacity })}
          onCommit={(opacity) =>
            gesture.commit({ opacity: undefinedIf(opacity, 1) })
          }
        />
      </div>
      <div className={css.rowBtns} style={{ marginTop: 6 }}>
        {!isSpotKind(node.kind) && (
          <button
            type='button'
            aria-pressed={node.flip === true}
            onClick={() =>
              editNode(node.id, { flip: node.flip ? undefined : true })
            }
          >
            flip {node.flip ? '◀' : '▶'}
          </button>
        )}
        {isSpotKind(node.kind) && (
          <button
            type='button'
            aria-pressed={node.pulse === true}
            onClick={() =>
              editNode(node.id, { pulse: node.pulse ? undefined : true })
            }
          >
            pulse {node.pulse ? '●' : '○'}
          </button>
        )}
        {!isSpotKind(node.kind) && (
          <button
            type='button'
            aria-pressed={node.shade === true}
            onClick={() =>
              editNode(node.id, { shade: node.shade ? undefined : true })
            }
          >
            shade {node.shade ? '●' : '○'}
          </button>
        )}
        <button type='button' onClick={() => duplicateNode(node.id)}>
          duplicate
        </button>
        <button
          type='button'
          className={css.danger}
          onClick={() => removeNode(node.id)}
        >
          delete
        </button>
      </div>
    </Section>
  )
}

const writeTargetLabel = (node: DecorNode, regime: Regime) => {
  if (regime === 'm' && !isMobileOnlyNode(node)) return 'mobile copy (splits)'
  const target = placementTarget(node)
  return target === 'base' ? 'base' : `${target} fork`
}

function RegimeSection({ node }: { node: DecorNode }) {
  const regime = useStoreSelector(stageSizeStore, (size) => regimeAt(size.w))
  const target = placementTarget(node)
  return (
    <Section title='regimes'>
      <div className={css.regimeRow}>
        {REGIMES.map((entry) => (
          <button
            key={entry}
            type='button'
            className={css.regimeChip}
            data-off={node.hide?.includes(entry) || undefined}
            data-fork={node.over?.[entry] !== undefined || undefined}
            data-now={entry === regime || undefined}
            aria-pressed={!node.hide?.includes(entry)}
            onClick={() => toggleRegime(node.id, entry)}
          >
            {entry}
          </button>
        ))}
        {target === 'base' ? (
          <button type='button' onClick={() => forkRegime(node.id)}>
            fork {regime}
          </button>
        ) : (
          <button type='button' onClick={() => dropFork(node.id)}>
            drop fork
          </button>
        )}
      </div>
      <div className={css.writeTarget}>
        placement writes → <b>{writeTargetLabel(node, regime)}</b>
      </div>
    </Section>
  )
}

function NodeInspector({ id }: { id: string }) {
  const node = useStoreSelector(decorStore, (doc) =>
    doc.nodes.find((entry) => entry.id === id),
  )
  const regime = useStoreSelector(stageSizeStore, (size) => regimeAt(size.w))
  if (!node) return null
  const place = { ...node, ...node.over?.[regime] }
  return (
    <>
      <NodeHead node={node} />
      <AnchorSection node={node} />
      <PlacementSection node={node} place={place} />
      <LookSection node={node} />
      <RegimeSection node={node} />
    </>
  )
}
export default function Inspector() {
  const selection = useStoreSelector(selectionStore, (value) => value)
  if (!selection) {
    return (
      <p className={css.hintText}>
        click anything in the scene to select it. drag from ADD to place a prop.
        scrub any number, or click it to type.
      </p>
    )
  }
  if (selection.kind === 'node') {
    return <NodeInspector key={selection.id} id={selection.id} />
  }
  return <ChromeInspector key={selection.id} id={selection.id} />
}
