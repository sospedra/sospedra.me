const MAX_LEGACY_KEY_CODE = 255
const MAX_HUE = 360

export const hueFor = (which: number): number =>
  (which / MAX_LEGACY_KEY_CODE) * MAX_HUE

export type KeyPress = {
  which: number
  code: string
  key: string
}

export type WaveParams = {
  frequency: number
  amplitude: number
  split: number
  tint: readonly [number, number, number]
}

export const IDLE_WAVE: WaveParams = {
  frequency: 1,
  amplitude: 0.5,
  split: 0.05,
  tint: [1, 1, 1],
}

const SATURATION = 0.85
const LIGHTNESS = 0.62

const rgbChannel = (offset: number, hue: number): number => {
  const k = (offset + hue / 30) % 12
  const chroma = SATURATION * Math.min(LIGHTNESS, 1 - LIGHTNESS)
  return LIGHTNESS - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1))
}

export const rgbFor = (hue: number): [number, number, number] => [
  rgbChannel(0, hue),
  rgbChannel(8, hue),
  rgbChannel(4, hue),
]

const TINT_STRENGTH = 0.65

const towardWhite = (channel: number): number =>
  1 - TINT_STRENGTH + channel * TINT_STRENGTH

export const KEY_ROWS: readonly (readonly string[])[] = [
  [
    'Backquote',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Digit5',
    'Digit6',
    'Digit7',
    'Digit8',
    'Digit9',
    'Digit0',
    'Minus',
    'Equal',
    'Backspace',
  ],
  [
    'Tab',
    'KeyQ',
    'KeyW',
    'KeyE',
    'KeyR',
    'KeyT',
    'KeyY',
    'KeyU',
    'KeyI',
    'KeyO',
    'KeyP',
    'BracketLeft',
    'BracketRight',
    'Backslash',
  ],
  [
    'CapsLock',
    'KeyA',
    'KeyS',
    'KeyD',
    'KeyF',
    'KeyG',
    'KeyH',
    'KeyJ',
    'KeyK',
    'KeyL',
    'Semicolon',
    'Quote',
    'Enter',
  ],
  [
    'ShiftLeft',
    'KeyZ',
    'KeyX',
    'KeyC',
    'KeyV',
    'KeyB',
    'KeyN',
    'KeyM',
    'Comma',
    'Period',
    'Slash',
    'ShiftRight',
  ],
  ['Space'],
]

// Departure Mono advances 0.636em per glyph; 0.65 adds fit slack
const GLYPH_ADVANCE_EM = 0.65

export const glyphFit = (chars: number): string =>
  `calc((100vw - 2 * var(--frame-pad)) / ${(Math.max(chars, 1) * GLYPH_ADVANCE_EM).toFixed(2)})`

const SPECIAL_PRESS: Record<string, { key: string; which: number }> = {
  Backquote: { key: '`', which: 192 },
  Minus: { key: '-', which: 189 },
  Equal: { key: '=', which: 187 },
  Backspace: { key: 'Backspace', which: 8 },
  Tab: { key: 'Tab', which: 9 },
  BracketLeft: { key: '[', which: 219 },
  BracketRight: { key: ']', which: 221 },
  Backslash: { key: '\\', which: 220 },
  CapsLock: { key: 'CapsLock', which: 20 },
  Semicolon: { key: ';', which: 186 },
  Quote: { key: "'", which: 222 },
  Enter: { key: 'Enter', which: 13 },
  ShiftLeft: { key: 'Shift', which: 16 },
  ShiftRight: { key: 'Shift', which: 16 },
  Comma: { key: ',', which: 188 },
  Period: { key: '.', which: 190 },
  Slash: { key: '/', which: 191 },
  Space: { key: ' ', which: 32 },
}

export const pressFor = (code: string): KeyPress => {
  const special = SPECIAL_PRESS[code]
  if (special) return { code, ...special }
  if (code.startsWith('Key')) {
    return { code, key: code.slice(3).toLowerCase(), which: code.charCodeAt(3) }
  }
  if (code.startsWith('Digit')) {
    return { code, key: code.slice(5), which: code.charCodeAt(5) }
  }
  return { code, key: code, which: 0 }
}

type KeyPosition = { row: number; col: number }

const KEY_POSITIONS = new Map<string, KeyPosition>(
  KEY_ROWS.flatMap((codes, row) =>
    codes.map((code, col): [string, KeyPosition] => [code, { row, col }]),
  ),
)

const F_POSITION = { row: 2, col: 4 }
const FREQ_AT_F = 1.088
const FREQ_COL_STEP = 0.05
const AMP_AT_F = 0.636
const AMP_ROW_STEP = 0.05
const HUE_COL_STEP = 27

const FALLBACK_FREQ_MIN = 0.888
const FALLBACK_FREQ_SPAN = 0.65
const FALLBACK_AMP_MIN = 0.536
const FALLBACK_AMP_SPAN = 0.2

const HASH_STEPS = 89
const SPLIT_PRINTABLE = 0.045
const SPLIT_CONTROL = 0.11

const codeWeight = (code: string): number => {
  const sum = [...code].reduce((total, char) => total + char.charCodeAt(0), 0)
  return (sum % HASH_STEPS) / HASH_STEPS
}

const frequencyFor = (
  position: KeyPosition | undefined,
  which: number,
): number =>
  position
    ? FREQ_AT_F + (position.col - F_POSITION.col) * FREQ_COL_STEP
    : FALLBACK_FREQ_MIN + (which / MAX_LEGACY_KEY_CODE) * FALLBACK_FREQ_SPAN

const amplitudeFor = (
  position: KeyPosition | undefined,
  code: string,
): number =>
  position
    ? AMP_AT_F + (position.row - F_POSITION.row) * AMP_ROW_STEP
    : FALLBACK_AMP_MIN + codeWeight(code) * FALLBACK_AMP_SPAN

const hueAt = (position: KeyPosition | undefined, which: number): number =>
  position ? position.col * HUE_COL_STEP : hueFor(which)

export const waveFor = ({ which, code, key }: KeyPress): WaveParams => {
  const position = KEY_POSITIONS.get(code)
  const [r, g, b] = rgbFor(hueAt(position, which))
  return {
    frequency: frequencyFor(position, which),
    amplitude: amplitudeFor(position, code),
    split: key.length > 1 ? SPLIT_CONTROL : SPLIT_PRINTABLE,
    tint: [towardWhite(r), towardWhite(g), towardWhite(b)],
  }
}

export const captionFor = ({
  frequency,
  amplitude,
  split,
}: WaveParams): string =>
  `freq ${frequency.toFixed(2)} · amp ${amplitude.toFixed(2)} · split ${split.toFixed(3)}`

export type Note =
  | { kind: 'tone'; frequency: number; name: string }
  | { kind: 'hit'; center: number; name: 'noise' }

const PENTATONIC = [0, 2, 4, 7, 9]
const PENTATONIC_STEPS = 24
const BASE_MIDI = 48
const A4_HZ = 440
const A4_MIDI = 69
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

const midiHz = (midi: number): number => A4_HZ * 2 ** ((midi - A4_MIDI) / 12)

const midiName = (midi: number): string =>
  `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`

const HIT_CENTER_MIN = 400
const HIT_CENTER_SPAN = 4000

const OCTAVE_BY_ROW = [2, 1, 0, -1, -1]

const midiAt = ({ row, col }: KeyPosition): number =>
  BASE_MIDI +
  OCTAVE_BY_ROW[row] * 12 +
  12 * Math.floor(col / PENTATONIC.length) +
  PENTATONIC[col % PENTATONIC.length]

const fallbackMidi = (which: number): number => {
  const step = Math.round((which / MAX_LEGACY_KEY_CODE) * PENTATONIC_STEPS)
  return (
    BASE_MIDI +
    12 * Math.floor(step / PENTATONIC.length) +
    PENTATONIC[step % PENTATONIC.length]
  )
}

export const noteFor = ({ which, code, key }: KeyPress): Note => {
  if (key.length > 1) {
    return {
      kind: 'hit',
      center: HIT_CENTER_MIN + (which / MAX_LEGACY_KEY_CODE) * HIT_CENTER_SPAN,
      name: 'noise',
    }
  }
  const position = KEY_POSITIONS.get(code)
  const midi = position ? midiAt(position) : fallbackMidi(which)
  return { kind: 'tone', frequency: midiHz(midi), name: midiName(midi) }
}
