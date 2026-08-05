import { GLOW_COLORS } from '../decor'

/* structural pieces spawnable as loose props */
export const ARCH_INVENTORY = [
  'beam-v',
  'beam-v-thin',
  'beam-v-lattice',
  'beam-v-pipe',
  'beam-v-timber',
  'beam-h-tile',
  'beam-h-alt-a',
  'beam-h-alt-b',
  'beam-h-alt-c',
  'beam-h-cable',
  'beam-h-catwalk',
  'stairs',
  'sm',
  'deck-m',
  'wf-tile',
  'wf-min-a2',
  'wf-min-b2',
  'wf-wood-c',
] as const

/* the in-between band skins the editor cycles through */
export const SEP_SKINS = [
  'beam-h-tile',
  'beam-h-alt-a',
  'beam-h-alt-b',
  'beam-h-alt-c',
  'beam-h-cable',
  'beam-h-catwalk',
] as const

/* the WF wall skins the editor cycles through (sets the floor's --wf) */
export const WALL_SKINS = [
  'wf-tile',
  'wf-min-a2',
  'wf-min-b2',
  'wf-wood-c',
] as const

/* z law: wf 0 · stairs 1 · props 2+ · stalls 3 · glows 4+ · seps 5 */
export const SPAWN_Z = { deco: 2, arch: 2, glow: 4, shadow: 4 } as const

export const SPOT_DEFAULT = { w: 220, h: 220 }

/* spawn heights in su, baked from the editor sessions (the sizes
   that made each prop's art-pixel grain sit right in the scene) */
export const SPAWN_H: Record<string, number> = {
  'beam-v': 597,
  'beam-v-thin': 597,
  'beam-v-lattice': 597,
  'beam-v-pipe': 597,
  'beam-v-timber': 597,
  'beam-h-tile': 225,
  'beam-h-alt-a': 225,
  'beam-h-alt-b': 225,
  'beam-h-alt-c': 225,
  'beam-h-cable': 225,
  'beam-h-catwalk': 225,
  stairs: 657,
  sm: 597,
  'deck-m': 60,
  'wf-tile': 597,
  'wf-min-a2': 597,
  'wf-min-b2': 597,
  'wf-wood-c': 597,
  'archive-box': 120,
  'barrel-dented': 152,
  'bowl-tower': 83,
  'bulb-string': 68,
  'bulkhead-lamp': 55,
  'cable-drop': 220,
  'candle-pole': 415,
  'clip-wires': 62,
  'copper-pipe': 51,
  'crack-rebar': 120,
  'crate-stack': 180,
  'crt-pile': 148,
  'damp-stain': 92,
  'desk-lamp': 39,
  'exit-box': 48,
  'flyer-patch': 120,
  'graffiti-tag': 88,
  'joystick-bin': 86,
  'lantern-string': 66,
  'maneki-neko': 106,
  'map-barrel': 203,
  'menu-board': 138,
  'neon-column': 249,
  'noodle-vending': 172,
  'oil-drum': 144,
  'pachinko-husk': 310,
  'pendant-lamp': 175,
  'plant-basket': 168,
  'pulley-hook': 184,
  'rust-bleed': 80,
  'server-tower': 168,
  'sodium-pack': 79,
  'soot-vent': 120,
  standee: 248,
  'stencil-arrow': 62,
  'suitcase-stack': 128,
  toolbox: 70,
  'trash-pile': 78,
  'tube-light': 42,
  'tv-cart': 164,
  'wall-pallet': 144,
  'water-station': 120,
  'wheatpaste-ad': 50,
}

/* unknowns: the batch renders ~400px tall; median approved ratio is ~2.9 */
export const FALLBACK_PX_PER_SU = 2.9

export const SPAWN_H_CAP = 420

export const GLOW_KEYS = Object.keys(GLOW_COLORS).filter(
  (key) => key !== 'black',
)
