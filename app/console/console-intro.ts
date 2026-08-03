import type { Tone } from './command-shell'
import { EYE_ART } from './console-art'

// an intro op prints a line (eye/text) or clears to the next screen; `hold`
// is the pause after it. The three screens sum to roughly 12 seconds.
export type Op = {
  kind: 'eye' | 'text' | 'clear'
  text?: string
  tone?: Tone
  hold: number
}

const EYE_LINES = EYE_ART.split('\n')

// award-bios style ascii table, fixed width so columns align in any font.
// inner width TW = left col (29) + right col (25) + 2 padding spaces
const TW = 56
const rule = () => `+${'-'.repeat(TW)}+`
const barTitle = (title: string) => {
  const label = `[ ${title} ]`
  const pad = TW - label.length
  const left = Math.floor(pad / 2)
  return `+${'='.repeat(left)}${label}${'='.repeat(pad - left)}+`
}
const trow = (left: string, right: string) =>
  `| ${left.padEnd(29)}${right.padEnd(25)} |`

export const buildIntroOps = (assetCount: number, linkCount: number): Op[] => [
  ...EYE_LINES.map((text): Op => ({ kind: 'eye', text, hold: 70 })),
  { kind: 'text', text: '', hold: 140 },
  {
    kind: 'text',
    text: 'S O S P E D R A   I N D U S T R I E S',
    tone: 'bright',
    hold: 480,
  },
  {
    kind: 'text',
    text: 'phosphor systems division · est 2013',
    tone: 'dim',
    hold: 1900,
  },
  { kind: 'clear', hold: 550 },
  { kind: 'text', text: 'PHOSPHOR BIOS v5.150', tone: 'bright', hold: 340 },
  {
    kind: 'text',
    text: 'Detecting processor ......... Pentium(R) OverDrive 66',
    hold: 440,
  },
  { kind: 'text', text: 'Detecting coprocessor ....... Present', hold: 340 },
  { kind: 'text', text: 'Memory test ................. 640K OK', hold: 460 },
  { kind: 'text', text: '', hold: 180 },
  {
    kind: 'text',
    text: barTitle('SYSTEM CONFIGURATION'),
    tone: 'dim',
    hold: 150,
  },
  {
    kind: 'text',
    text: trow('Main Processor : Pentium 66', 'Base Memory  : 640K'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow('Numeric Copro. : Present', 'Ext. Memory  : 15M'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow('Floppy Drive A : 1.44M 3.5"', 'Cache Memory : 256K'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow('Display Type   : EGA / VGA', 'Serial Port  : 03F8'),
    hold: 130,
  },
  {
    kind: 'text',
    text: trow(
      `Drive S:       : R/O ${assetCount}`,
      `Link Registry: ${linkCount}`,
    ),
    hold: 130,
  },
  { kind: 'text', text: rule(), tone: 'dim', hold: 1500 },
  { kind: 'clear', hold: 550 },
  { kind: 'text', text: 'Starting S-DOS...', tone: 'bright', hold: 620 },
  { kind: 'text', text: 'Loading PHOSPHOR.SYS ........ OK', hold: 340 },
  { kind: 'text', text: 'Loading S-DOS kernel ........ OK', hold: 340 },
  {
    kind: 'text',
    text: `Mounting S:/ ................ ${assetCount} files`,
    hold: 340,
  },
  { kind: 'text', text: 'Starting command shell ...... OK', hold: 560 },
  { kind: 'text', text: '', hold: 150 },
  {
    kind: 'text',
    text: 'SOSPEDRA IND. PERSONAL SYSTEM /S',
    tone: 'bright',
    hold: 240,
  },
  {
    kind: 'text',
    text: 'TAB completes · type HELP for the index',
    tone: 'dim',
    hold: 500,
  },
]
