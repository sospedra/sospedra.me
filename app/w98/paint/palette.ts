// The 28 default MS Paint colors, row-major: dark row, then bright row.
export const PALETTE: readonly string[] = [
  '#000000',
  '#808080',
  '#800000',
  '#808000',
  '#008000',
  '#008080',
  '#000080',
  '#800080',
  '#808040',
  '#004040',
  '#0080ff',
  '#004080',
  '#4000ff',
  '#804000',
  '#ffffff',
  '#c0c0c0',
  '#ff0000',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
  '#ffff80',
  '#00ff80',
  '#80ffff',
  '#8080ff',
  '#ff0080',
  '#ff8040',
]

export const DEFAULT_FG = '#000000'
export const DEFAULT_BG = '#ffffff'

export type Rgba = readonly [number, number, number, number]

export const toRgba = (hex: string): Rgba => {
  const packed = Number.parseInt(hex.slice(1), 16)
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff, 255]
}
