const LATIN_MAP: Record<string, string> = {
  Æ: 'Ae',
  æ: 'ae',
  Ð: 'D',
  ð: 'd',
  Ø: 'O',
  ø: 'o',
  Þ: 'Th',
  þ: 'th',
  ß: 'ss',
  Đ: 'D',
  đ: 'd',
  Ħ: 'H',
  ħ: 'h',
  ı: 'i',
  Ł: 'L',
  ł: 'l',
  Ŋ: 'N',
  ŋ: 'n',
  Œ: 'Oe',
  œ: 'oe',
  Ŧ: 'T',
  ŧ: 't',
  ſ: 's',
}

const RX_MARKS = /\p{M}/gu
const RX_MAPPED_LETTER = new RegExp(`[${Object.keys(LATIN_MAP).join('')}]`, 'g')

export function deburr(input: string): string {
  return input
    .normalize('NFKD')
    .replace(RX_MARKS, '')
    .replace(RX_MAPPED_LETTER, (char) => LATIN_MAP[char])
}
