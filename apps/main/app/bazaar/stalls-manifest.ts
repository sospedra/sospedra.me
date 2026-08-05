import { uniq } from 'es-toolkit'

export type FxFrame = { file: string; ms: number }
export type StallLayer =
  | { id: string; role: 'plate'; file?: string }
  | {
      id: string
      role: 'effect'
      zorder: number
      frames: FxFrame[]
      hover?: string | string[]
    }
  | { id: string; role: 'prop'; zorder: number; rest: string; hover?: string[] }
  | {
      id: string
      role: 'char'
      zorder: number
      idle: FxFrame[]
      hover: FxFrame[]
    }

export type StallScene = {
  layers: StallLayer[]
  /** content rect inside the 1536x1024 master canvas; images are pre-cropped to it */
  rect: { left: number; top: number; width: number; height: number }
}

export const layerFiles = (layer: StallLayer): string[] => {
  if (layer.role === 'plate') return [layer.file ?? 'plate-key.png']
  if (layer.role === 'effect') {
    const hover = Array.isArray(layer.hover)
      ? layer.hover
      : layer.hover
        ? [layer.hover]
        : []
    return uniq([...layer.frames.map((frame) => frame.file), ...hover])
  }
  if (layer.role === 'prop') {
    return uniq([layer.rest, ...(layer.hover ?? [])])
  }
  return uniq([
    ...layer.idle.map((frame) => frame.file),
    ...layer.hover.map((frame) => frame.file),
  ])
}

export const STALL_SCENES = {
  uses: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'char',
        role: 'char',
        zorder: 1,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
      {
        id: 'fx-steam',
        role: 'effect',
        zorder: 2,
        frames: [
          { file: 'fx-steam-f1.png', ms: 320 },
          { file: 'fx-steam-f2.png', ms: 320 },
          { file: 'fx-steam-f3.png', ms: 320 },
          { file: 'fx-steam-f4.png', ms: 320 },
        ],
      },
      { id: 'customer', role: 'prop', zorder: 3, rest: 'customer-head.png' },
    ],
    rect: { left: 260, top: 45, width: 989, height: 894 },
  },
  papers: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'book',
        role: 'prop',
        zorder: 1,
        rest: 'book-f1.png',
        hover: ['book-h1.png', 'book-h2.png', 'book-h3.png', 'book-h4.png'],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 2,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
    ],
    rect: { left: 307, top: 87, width: 980, height: 862 },
  },
  manual: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'char',
        role: 'char',
        zorder: 1,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
      { id: 'front', role: 'prop', zorder: 5, rest: 'front-frame.png' },
    ],
    rect: { left: 411, top: 11, width: 673, height: 972 },
  },
  console: {
    layers: [
      { id: 'plate', role: 'plate', file: 'plate2-key.png' },
      {
        id: 'fx-crt',
        role: 'effect',
        zorder: 1,
        frames: [
          { file: 'fx2-crt-f1.png', ms: 220 },
          { file: 'fx2-crt-f2.png', ms: 220 },
          { file: 'fx2-crt-f3.png', ms: 220 },
        ],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 2,
        idle: [
          { file: 'char2-f1.png', ms: 1800 },
          { file: 'char2-f2.png', ms: 200 },
          { file: 'char2-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char2-h1.png', ms: 150 },
          { file: 'char2-h2.png', ms: 150 },
          { file: 'char2-h3.png', ms: 150 },
          { file: 'char2-h4.png', ms: 0 },
        ],
      },
    ],
    rect: { left: 0, top: 0, width: 974, height: 1061 },
  },
  talks: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'fx-smpte',
        role: 'effect',
        zorder: 1,
        frames: [
          { file: 'fx-smpte-f1.png', ms: 180 },
          { file: 'fx-smpte-f2.png', ms: 180 },
          { file: 'fx-smpte-f3.png', ms: 180 },
          { file: 'fx-smpte-f4.png', ms: 180 },
        ],
      },
      {
        id: 'tape',
        role: 'prop',
        zorder: 2,
        rest: 'tape-f1.png',
        hover: ['tape-f1.png', 'tape-f1.png', 'tape-f1.png', 'tape-f1.png'],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 3,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
      { id: 'counter', role: 'prop', zorder: 4, rest: 'counter-top.png' },
    ],
    rect: { left: 368, top: 9, width: 688, height: 1004 },
  },
  w98: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'fx-octo',
        role: 'effect',
        zorder: 1,
        frames: [
          { file: 'fx-octo-f1.png', ms: 1100 },
          { file: 'fx-octo-f2.png', ms: 1100 },
          { file: 'fx-octo-f3.png', ms: 1100 },
        ],
      },
      {
        id: 'fx-fuzzy',
        role: 'effect',
        zorder: 2,
        frames: [
          { file: 'fx-fuzzy-f1.png', ms: 700 },
          { file: 'fx-fuzzy-f2.png', ms: 700 },
          { file: 'fx-fuzzy-f3.png', ms: 700 },
        ],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 3,
        idle: [{ file: 'char-f1.png', ms: 1800 }],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
      {
        id: 'fx-water',
        role: 'effect',
        zorder: 4,
        frames: [
          { file: 'fx-water-f1.png', ms: 240 },
          { file: 'fx-water-f2.png', ms: 240 },
          { file: 'fx-water-f3.png', ms: 240 },
        ],
      },
    ],
    rect: { left: 325, top: 23, width: 884, height: 953 },
  },
  games: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'fx-arcade',
        role: 'effect',
        zorder: 1,
        frames: [
          { file: 'fx-arcade-f1.png', ms: 200 },
          { file: 'fx-arcade-f2.png', ms: 200 },
          { file: 'fx-arcade-f3.png', ms: 200 },
          { file: 'fx-arcade-f4.png', ms: 200 },
        ],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 2,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
    ],
    rect: { left: 443, top: 40, width: 662, height: 899 },
  },
  travel: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'fx-flames',
        role: 'effect',
        zorder: 1,
        frames: [
          { file: 'fx-flames-f1.png', ms: 260 },
          { file: 'fx-flames-f2.png', ms: 260 },
          { file: 'fx-flames-f3.png', ms: 260 },
        ],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 2,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
    ],
    rect: { left: 415, top: 3, width: 683, height: 960 },
  },
  map: {
    layers: [
      { id: 'plate', role: 'plate' },
      {
        id: 'fx-dot',
        role: 'effect',
        zorder: 1,
        frames: [
          { file: 'fx-dot-f1.png', ms: 600 },
          { file: 'fx-dot-f2.png', ms: 600 },
          { file: 'fx-dot-f3.png', ms: 600 },
        ],
      },
      {
        id: 'char',
        role: 'char',
        zorder: 2,
        idle: [
          { file: 'char-f1.png', ms: 1800 },
          { file: 'char-f2.png', ms: 200 },
          { file: 'char-f3.png', ms: 200 },
        ],
        hover: [
          { file: 'char-h1.png', ms: 150 },
          { file: 'char-h2.png', ms: 150 },
          { file: 'char-h3.png', ms: 150 },
          { file: 'char-h4.png', ms: 0 },
        ],
      },
    ],
    rect: { left: 518, top: 70, width: 500, height: 884 },
  },
} satisfies Record<string, StallScene>

export type BazaarStallId = keyof typeof STALL_SCENES

/* r15 sim composition law — all values in sim units (--su scales them) */
export const SIM_DIMS = {
  uses: {
    artW: 981,
    artH: 885,
    dispW: 576,
    dispH: 520,
  },
  papers: {
    artW: 972,
    artH: 853,
    dispW: 501,
    dispH: 440,
  },
  manual: {
    artW: 664,
    artH: 962,
    dispW: 345,
    dispH: 500,
  },
  console: {
    artW: 974,
    artH: 1061,
    dispW: 459,
    dispH: 500,
  },
  talks: {
    artW: 680,
    artH: 995,
    dispW: 342,
    dispH: 500,
  },
  w98: {
    artW: 876,
    artH: 945,
    dispW: 463,
    dispH: 500,
  },
  games: {
    artW: 653,
    artH: 891,
    dispW: 352,
    dispH: 480,
  },
  travel: {
    artW: 674,
    artH: 950,
    dispW: 341,
    dispH: 480,
  },
  map: {
    artW: 500,
    artH: 884,
    dispW: 260,
    dispH: 460,
  },
} satisfies Record<
  BazaarStallId,
  { artW: number; artH: number; dispW: number; dispH: number }
>
