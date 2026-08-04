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

const COLOR_NAMES: Readonly<Record<string, string>> = {
  '#000000': 'black',
  '#808080': 'gray',
  '#800000': 'maroon',
  '#808000': 'olive',
  '#008000': 'green',
  '#008080': 'teal',
  '#000080': 'navy',
  '#800080': 'purple',
  '#808040': 'dark khaki',
  '#004040': 'dark teal',
  '#0080ff': 'sky blue',
  '#004080': 'dark sky blue',
  '#4000ff': 'indigo',
  '#804000': 'brown',
  '#ffffff': 'white',
  '#c0c0c0': 'silver',
  '#ff0000': 'red',
  '#ffff00': 'yellow',
  '#00ff00': 'lime',
  '#00ffff': 'cyan',
  '#0000ff': 'blue',
  '#ff00ff': 'magenta',
  '#ffff80': 'pale yellow',
  '#00ff80': 'spring green',
  '#80ffff': 'pale cyan',
  '#8080ff': 'pale blue',
  '#ff0080': 'rose',
  '#ff8040': 'coral',
}

export const colorName = (hex: string): string => COLOR_NAMES[hex] ?? hex

export const DEFAULT_FG = '#000000'
export const DEFAULT_BG = '#ffffff'

export type Rgba = readonly [number, number, number, number]

export const toRgba = (hex: string): Rgba => {
  const packed = Number.parseInt(hex.slice(1), 16)
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff, 255]
}
