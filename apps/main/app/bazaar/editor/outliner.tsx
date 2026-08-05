'use client'

import { useEffect, useState } from 'react'
import { useStoreSelector } from 'services/external-store'
import {
  type DecorHost,
  type DecorKind,
  type DecorNode,
  indexNodes,
  REGIMES,
  rootHostOf,
} from '../decor'
import { decorStore } from '../decor-store'
import { chromeStore, chromeTouched } from './chrome-store'
import css from './lists.module.css'
import { chromeIds, editEls } from './probe'
import { getNode, hoverStore, selectionStore, selectNode } from './store'

const KIND_GLYPH: Record<DecorKind, string> = {
  deco: '▪',
  arch: '▤',
  glow: '◉',
  shadow: '◐',
}

const HOST_ORDER: string[] = [
  'street',
  'sep:0',
  'floor:0',
  'sep:1',
  'floor:1',
  'sep:2',
  'floor:2',
  'sep:3',
  'stall:uses',
  'stall:papers',
  'stall:manual',
  'stall:console',
  'stall:talks',
  'stall:w98',
  'stall:games',
  'stall:travel',
  'stairs:0',
  'stairs:1',
  'stairs:2',
  'mfloor:0',
  'mfloor:1',
  'mfloor:2',
  'mfloor:3',
  'sm:0',
  'sm:1',
  'sm:2',
  'sm:3',
]

const hostRank = (host: string) => {
  const index = HOST_ORDER.indexOf(host)
  return index === -1 ? HOST_ORDER.length : index
}

const scrollToTarget = (id: string) => {
  const el = editEls(id).find((entry) => entry.offsetParent !== null)
  el?.scrollIntoView({ block: 'center', inline: 'center' })
}

function NodeRow({ node }: { node: DecorNode }) {
  const selected = useStoreSelector(
    selectionStore,
    (value) => value?.kind === 'node' && value.id === node.id,
  )
  return (
    <button
      type='button'
      className={css.itemRow}
      data-on={selected || undefined}
      onMouseEnter={() => hoverStore.set(node.id)}
      onMouseLeave={() => hoverStore.set(null)}
      onClick={() => {
        selectNode(node.id)
        scrollToTarget(node.id)
      }}
    >
      <span className={css.itemGlyph} aria-hidden>
        {KIND_GLYPH[node.kind]}
      </span>
      <span className={css.itemRef}>{node.ref}</span>
      <span className={css.itemDots} aria-hidden>
        {REGIMES.map((regime) => (
          <span
            key={regime}
            className={css.itemDot}
            data-off={node.hide?.includes(regime) || undefined}
            data-fork={node.over?.[regime] !== undefined || undefined}
          />
        ))}
      </span>
      <span className={css.itemMeta}>z{node.z}</span>
    </button>
  )
}

function ChromeRow({ id }: { id: string }) {
  const selected = useStoreSelector(
    selectionStore,
    (value) => value?.kind === 'chrome' && value.id === id,
  )
  const patched = useStoreSelector(chromeStore, (map) => chromeTouched(map, id))
  return (
    <button
      type='button'
      className={css.itemRow}
      data-on={selected || undefined}
      onMouseEnter={() => hoverStore.set(id)}
      onMouseLeave={() => hoverStore.set(null)}
      onClick={() => {
        selectionStore.set({ kind: 'chrome', id })
        scrollToTarget(id)
      }}
    >
      <span className={css.itemGlyph} aria-hidden>
        ▣
      </span>
      <span className={css.itemRef}>{id}</span>
      {patched && <span className={css.itemMeta}>patched</span>}
    </button>
  )
}

const matches = (node: DecorNode, query: string) =>
  query === '' ||
  node.ref.includes(query) ||
  node.id.includes(query) ||
  node.host.includes(query)

export default function Outliner() {
  const doc = useStoreSelector(decorStore, (value) => value)
  const [query, setQuery] = useState('')
  const [chrome, setChrome] = useState<string[]>([])

  useEffect(() => {
    setChrome(chromeIds((id) => getNode(id) !== null).toSorted())
  }, [])

  const byId = indexNodes(doc)
  const groups = new Map<DecorHost, DecorNode[]>()
  for (const node of doc.nodes) {
    if (!matches(node, query)) continue
    const host = rootHostOf(byId, node)
    groups.set(host, [...(groups.get(host) ?? []), node])
  }
  const ordered = [...groups.entries()].toSorted(
    (a, b) => hostRank(a[0]) - hostRank(b[0]),
  )
  const shownChrome = chrome.filter((id) => query === '' || id.includes(query))

  return (
    <>
      <input
        className={css.search}
        placeholder='filter nodes…'
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {ordered.map(([host, nodes]) => (
        <div key={host}>
          <div className={css.groupHead}>
            <span>{host}</span>
            <span>{nodes.length}</span>
          </div>
          {nodes.map((node) => (
            <NodeRow key={node.id} node={node} />
          ))}
        </div>
      ))}
      {shownChrome.length > 0 && (
        <div>
          <div className={css.groupHead}>
            <span>chrome</span>
            <span>{shownChrome.length}</span>
          </div>
          {shownChrome.map((id) => (
            <ChromeRow key={id} id={id} />
          ))}
        </div>
      )}
    </>
  )
}
