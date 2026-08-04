/* Stall prop constellations, baked from the 2026-08-04 editor session.
   Every prop anchors to a stall wrap: x/y are sim units from the wrap's
   top-left, so props ride the flex layout through both regimes and every
   viewport. Spawn-to-spawn anchor chains from the session are composed
   down to the stall here. z: -1 paints behind the stall art, 1 in front;
   glows always sit on top (screen blending commutes, order is free). */

import type { BazaarStallId } from './stalls-manifest'

export type StallProp =
  | {
      kind: 'deco'
      ref: string
      x: number
      y: number
      h: number
      z: -1 | 1
      bright: number
    }
  | {
      kind: 'glow'
      ref: string
      x: number
      y: number
      w: number
      h: number
      bright: number
    }

const deco = (
  ref: string,
  x: number,
  y: number,
  h: number,
  bright = 1,
): StallProp => ({ kind: 'deco', z: -1, ref, x, y, h, bright })

const front = (
  ref: string,
  x: number,
  y: number,
  h: number,
  bright = 1,
): StallProp => ({ kind: 'deco', z: 1, ref, x, y, h, bright })

const glow = (
  ref: string,
  x: number,
  y: number,
  w: number,
  h: number,
  bright = 1,
): StallProp => ({ kind: 'glow', ref, x, y, w, h, bright })

export const STALL_PROPS = {
  uses: [
    deco('noodle-vending', -99.4, 288.2, 172),
    deco('bowl-tower', -66.3, 216.9, 83, 0.8),
    front('menu-board', 515, 396.1, 138),
    glow('red', 427.3, 33.9, 220, 220),
    glow('red', -32.7, 27.8, 220, 220),
    glow('amber', -133.8, 252.9, 220, 220),
  ],
  papers: [
    deco('archive-box', -40.5, 251.7, 120),
    deco('duct-straps', 414.1, -135.7, 142, 0.7),
    glow('cyan', 100.9, 63.5, 260.9, 197.8, 0.8),
  ],
  manual: [
    deco('pulley-hook', -108, -37.9, 174.4, 0.8),
    deco('barrel-dented', -53.2, 299.6, 152, 0.8),
    deco('gear-pallet', 280.1, 356, 112, 0.8),
    front('copper-pipe', -19.2, -25.2, 51, 0.8),
    glow('amber', -12.7, 95.2, 110, 220, 0.8),
    glow('cyan', 238, 105.7, 97.5, 220),
  ],
  console: [
    deco('neon-column', 399.8, 217.7, 213.1),
    deco('cartridge-crate', 4.6, 339.8, 89.2, 0.8),
    front('holo-fish', 153.2, 124.6, 55.7),
    glow('green', 11.5, 103, 198.2, 198.2, 0.8),
    glow('cyan', 124.7, 84.5, 111.5, 111.5),
    glow('cyan', 386.8, 195.3, 90.4, 90.4),
    glow('pink', 388.5, 228.8, 96.1, 96.1, 1.3),
    glow('cyan', 389.1, 272.7, 96.4, 96.4),
    glow('pink', 395.4, 338.2, 73.9, 73.9, 1.4),
  ],
  talks: [
    deco('tv-cart', -61.7, 282.2, 164, 0.7),
    deco('vhs-tower', 317.9, 296.8, 136, 0.6),
    deco('reel-cans', 317.3, 355.6, 85, 0.8),
    glow('cyan', -15, -25.8, 388.3, 138.2),
    glow('green', -24, 190, 220, 220),
  ],
  w98: [
    deco('plant-basket', -57.9, 70.8, 168, 0.7),
    deco('grow-lamp', -117, 255.4, 207),
    deco('pot-cluster', 194.2, 339.4, 92, 0.7),
    glow('amber', 4.2, -3.4, 454.1, 135.5, 0.8),
    glow('red', -14.3, 105.7, 336.4, 327.6),
    glow('red', -115.2, 295.1, 165.9, 172.5, 1.4),
  ],
  games: [
    front('plush-pile', 61.5, 415.3, 81.5),
    front('joystick-bin', -6.4, 430.1, 65.3),
    glow('cyan', 39.4, 163.6, 143.7, 183, 0.8),
    glow('red', -5.8, 20.7, 369.2, 220),
  ],
  travel: [
    deco('junction-led', 342.4, -63.4, 96.9),
    deco('crate-stack', -69.8, 262.2, 180, 0.8),
    deco('cable-spool', 282.2, 300.6, 136.4, 0.8),
    front('map-barrel', 276.7, 348, 141.7, 0.9),
    glow('green', 263.6, -112.5, 220, 220),
    glow('amber', -32, 228.7, 147.2, 147.2),
    glow('amber', 196.1, 135.9, 163.9, 163.9),
    glow('amber', 167.8, 251.2, 106.5, 106.5),
  ],
} satisfies Record<BazaarStallId, StallProp[]>

/* per-stall lift off the band floor (su) and art dim, same session */
export const STALL_TUNE: Record<BazaarStallId, { lift: number; dim?: number }> =
  {
    uses: { lift: 47 },
    papers: { lift: 28, dim: 0.9 },
    manual: { lift: 57 },
    console: { lift: 35.8 },
    talks: { lift: 44.4 },
    w98: { lift: 58.7 },
    games: { lift: 62 },
    travel: { lift: 57.4 },
  }

/* editor glow palette: spawnable lighting spots */
export const GLOW_COLORS: Record<string, string> = {
  amber: 'rgb(255 190 90 / 0.5)',
  cyan: 'rgb(75 210 225 / 0.45)',
  pink: 'rgb(255 95 170 / 0.45)',
  teal: 'rgb(86 180 164 / 0.4)',
  red: 'rgb(221 96 72 / 0.45)',
  green: 'rgb(149 162 71 / 0.4)',
  black: 'rgb(0 0 0 / 0.6)',
}
