/* Stage layout, baked from the 2026-07-31 editor session.
   One absolute stage per floor: stalls, props and signs share a single
   stacking context so every z works, negatives behind stalls included.
   Coordinates in sim units, band-local (band = 1483 wide, floor = 597
   tall); h is the rendered height with the editor scale folded in.
   Anchored items carry ax/ay offsets from their anchor's top-left and
   resolve at module load. */

export type StageItem = {
  kind: 'stall' | 'deco' | 'sign' | 'glow'
  id: string
  x?: number
  y?: number
  w?: number
  h?: number
  z: number
  anchor?: string
  ax?: number
  ay?: number
}

const stall = (id: string, x: number, y: number, z = 2): StageItem => ({
  kind: 'stall',
  id,
  x,
  y,
  z,
})

const deco = (
  id: string,
  x: number,
  y: number,
  h: number,
  z: number,
): StageItem => ({ kind: 'deco', id, x, y, h, z })

const anchored = (
  id: string,
  anchor: string,
  ax: number,
  ay: number,
  h: number,
  z: number,
): StageItem => ({ kind: 'deco', id, anchor, ax, ay, h, z })

const glow = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  z = 5,
): StageItem => ({ kind: 'glow', id, x, y, w, h, z })

const aglow = (
  id: string,
  anchor: string,
  ax: number,
  ay: number,
  w: number,
  h: number,
  z = 5,
): StageItem => ({ kind: 'glow', id, anchor, ax, ay, w, h, z })

const sign = (
  id: 'up' | 'down',
  x: number,
  y: number,
  h: number,
): StageItem => ({
  kind: 'sign',
  id,
  x,
  y,
  h,
  z: 6,
})

export const STAGE: StageItem[][] = [
  /* floor 1 — uses · papers · stairs right */
  [
    stall('uses', 152.4, 13, 4),
    stall('papers', 922.4, 88.7, 3),
    sign('up', 1440, 4, 94),
    sign('down', 8, 4, 94),
    {
      kind: 'deco' as const,
      id: 'torii-scrap',
      x: -180,
      y: 32.4,
      w: 494.1,
      h: 487.9,
      z: 2,
    },
    anchored('soot-vent', 'deco:torii-scrap', 232.2, 218.8, 120.2, -2),
    anchored('damp-stain', 'deco:torii-scrap', 134.5, -135.4, 92.1, 1),
    deco('lantern-string', 684.2, 4, 66, 1),
    deco('bulb-string', 190, 10, 68, 1),
    deco('pendant-lamp', 1331.3, 3.7, 175, 1),
    deco('bulkhead-lamp', 528, 138, 55, 1),
    deco('bulkhead-lamp', 1185, 138, 55, 1),
    deco('wheatpaste-ad', 771.3, 256.1, 49.9, 1),
    deco('flyer-patch', 789.3, 173.9, 120.2, 1),
    deco('menu-board', 643.3, 415, 138, 5),
    anchored('noodle-vending', 'uses', -219.8, 312.1, 172, 2),
    anchored('bowl-tower', 'deco:noodle-vending', 34, -68.9, 83.1, 5),
    anchored('trash-pile', 'uses', -88.5, 396.2, 78, 5),
    anchored('archive-box', 'papers', -61.7, 285.4, 120.2, -3),
    anchored('crate-stack', 'papers', 413.7, 224.5, 180.3, -2),
    anchored('desk-lamp', 'papers', 314.3, 211.5, 38.9, -1),
    anchored('wall-pallet', 'uses', 498.6, 335.9, 144.4, -2),
    glow('red', 175.4, 31.6, 220.1, 220.1, 2),
    aglow('red', 'uses', 415.9, 27.1, 220.1, 220.1, 3),
    aglow('amber', 'deco:lantern-string', -167.6, -48.5, 645.2, 203, -3),
    glow('amber', -50.5, 280.5, 220.1, 220.1),
    glow('cyan', 1070.9, 162.7, 275.4, 259.1),
    aglow('green', 'deco:pendant-lamp', -32, 35.4, 147.9, 380.4),
    glow('amber', 1576.7, 486.1, 227.6, 110.1),
  ],
  /* floor 2 — stairs left · manual · console · videoclub */
  [
    stall('manual', 178.5, 20.1),
    stall('console', 656.9, 84.3, 4),
    stall('talks', 1130, 25.6, 3),
    sign('up', 8, 4, 94),
    sign('down', 1491, 4, 94),
    anchored('pulley-hook', 'manual', 373.5, -18.6, 183.5, 1),
    deco('clip-wires', 763.1, -4.3, 62, 1),
    deco('stencil-arrow', 36, 210, 62, 1),
    deco('tube-light', 731.2, 102.1, 42, 1),
    deco('graffiti-tag', 399.9, 304.3, 88, 1),
    deco('rust-bleed', 1408, 7.7, 80, 1),
    deco('pachinko-husk', 1315, 188, 309.5, 1),
    anchored('cable-drop', 'deco:pachinko-husk', 113.1, -192.5, 219.7, -1),
    anchored('crack-rebar', 'deco:pachinko-husk', -106, 176.6, 120.2, -1),
    deco('maneki-neko', 941.6, 441.1, 106, 5),
    deco('server-tower', 987.6, 324, 168, 0),
    anchored('tv-cart', 'talks', -58.5, 308.5, 164.2, -2),
    anchored('standee', 'talks', 240.9, 225.6, 248.2, -3),
    anchored('copper-pipe', 'manual', -8.3, -22.7, 51, 6),
    deco('toolbox', 121.9, 445.1, 70.3, 1),
    deco('oil-drum', 99.6, 359.1, 144.2, -1),
    anchored('crt-pile', 'console', -77.8, 254.2, 148, 6),
    deco('neon-column', 1042.9, 223.7, 249, -2),
    aglow('amber', 'manual', -31.2, 126.5, 140.4, 314.1),
    aglow('teal', 'manual', 226.5, 129.1, 141.3, 308.6),
    aglow('amber', 'deco:tube-light', -123.9, -86.5, 425.7, 207.8, -3),
    glow('cyan', 1267.1, -37.8, 469.8, 205.8),
    aglow('pink', 'deco:neon-column', -79.7, 87.5, 220.1, 220.1),
    aglow('cyan', 'deco:neon-column', -67.6, 23.9, 220.1, 220.1),
    glow('pink', 1023.2, 189, 220.1, 220.1),
    aglow('cyan', 'deco:neon-column', -73.9, -94.4, 220.1, 220.1),
    aglow('green', 'console', 23.1, 25.4, 220.1, 220.1),
    aglow('amber', 'deco:clip-wires', 51.8, -13.4, 133.4, 168.8),
    aglow('amber', 'deco:clip-wires', 224.1, -27.3, 148.2, 203.2),
    aglow('green', 'talks', -3.7, 218.5, 150.4, 155),
  ],
  /* floor 3 — stairs left · w98 · games · travel */
  [
    stall('w98', 153.6, 29.2),
    stall('games', 743.6, 64.8),
    stall('travel', 1118, 20.1),
    sign('up', 1391, 4, 94),
    deco('exit-box', 1050, 60, 48, 1),
    anchored('sodium-pack', 'w98', -49.7, 82.1, 79, 1),
    deco('flyer-patch', 583.1, 229.3, 88, 1),
    deco('candle-pole', 1110.3, 112.4, 414.6, 5),
    anchored('plant-basket', 'w98', 421.6, -24.5, 168, 1),
    anchored('water-station', 'w98', -40.2, 350.9, 120.2, -1),
    deco('joystick-bin', 744.8, 409.4, 86, 0),
    anchored('barrel-dented', 'w98', 386.6, 306.2, 151.8, -1),
    anchored('suitcase-stack', 'travel', 312.3, 357.4, 128, 0),
    anchored('map-barrel', 'travel', 391, 278.3, 202.6, -1),
    aglow('amber', 'deco:sodium-pack', -93.5, -133.9, 261.5, 310.6, -3),
    glow('cyan', 831.3, 207.3, 152.1, 224.5),
    aglow('amber', 'deco:candle-pole', -18.8, -28.8, 186.7, 219.3),
    glow('amber', 1059.4, 137.5, 220.1, 220.1),
    aglow('amber', 'deco:candle-pole', -46.5, 83.9, 220.1, 220.1),
    glow('red', 126.7, 119.4, 334.2, 381.9),
    glow('amber', 741.8, 300, 220.1, 220.1),
    glow('red', 788.3, 20.9, 365.6, 265.3, -2),
    aglow('cyan', 'deco:exit-box', -47.5, -42.6, 172.6, 171.5),
  ],
]

export type ResolvedItem = StageItem & { x: number; y: number }

/** resolve anchor chains into band coordinates at module load */
const resolveFloor = (items: StageItem[]): ResolvedItem[] => {
  const byId = new Map<string, StageItem>()
  for (const item of items) {
    const key = item.kind === 'deco' ? `deco:${item.id}` : item.id
    if (!byId.has(key)) byId.set(key, item)
  }
  const seen = new Set<StageItem>()
  const pos = (item: StageItem): { x: number; y: number } => {
    if (item.anchor === undefined) return { x: item.x ?? 0, y: item.y ?? 0 }
    if (seen.has(item)) return { x: item.x ?? 0, y: item.y ?? 0 }
    seen.add(item)
    const parent = byId.get(item.anchor)
    if (!parent) return { x: item.x ?? 0, y: item.y ?? 0 }
    const p = pos(parent)
    return { x: p.x + (item.ax ?? 0), y: p.y + (item.ay ?? 0) }
  }
  return items.map((item) => ({ ...item, ...pos(item) }))
}

export const STAGE_RESOLVED: ResolvedItem[][] = STAGE.map(resolveFloor)

/* street-level props: composed via the editor inventory, baked here */
export const STREET_STAGE: StageItem[] = [
  deco('trash-pile', 1587.7, 1033.1, 85.8, 2),
  deco('soot-vent', 51.9, 433.2, 80.1, 1),
  deco('wall-pallet', 53.2, 955.3, 120.2, 2),
]

export const STREET_RESOLVED: ResolvedItem[] = resolveFloor(STREET_STAGE)

/* editor glow palette: spawnable lighting spots, baked as kind 'glow' */
export const GLOW_COLORS: Record<string, string> = {
  amber: 'rgb(255 190 90 / 0.5)',
  cyan: 'rgb(75 210 225 / 0.45)',
  pink: 'rgb(255 95 170 / 0.45)',
  teal: 'rgb(86 180 164 / 0.4)',
  red: 'rgb(221 96 72 / 0.45)',
  green: 'rgb(149 162 71 / 0.4)',
  black: 'rgb(0 0 0 / 0.6)',
}
