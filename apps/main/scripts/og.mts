import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import {
  DEFAULT_LOCALE,
  localesOf,
  type PaperLocale,
  paperCardPath,
  type ReaderLocale,
} from '../services/markdown/paper.locales.ts'
import { absolute, readJson } from './io.mts'
import {
  type Metadata,
  slugFromPaperFile,
  updatePaperMetadata,
} from './papers.mts'

const WIDTH = 1200
const HEIGHT = 630
const MARGIN = 90

const TITLE_SIZE = 64
const TITLE_CENTER_BASELINE = 285
const TITLE_LINE_PITCH = 83
const WRAP_BUDGET = 26

// VCR OSD Mono carries no Cyrillic, so fontconfig swaps faces mid-line
const TITLE_FONT: Partial<Record<PaperLocale, string>> = { ru: 'Helvetica' }
// a proportional face fits more characters on the same 1020 px of headline
const WRAP_BUDGETS: Partial<Record<PaperLocale, number>> = { ru: 30 }

const APEX_X = 599.5
const APEX_Y = 469
const FAN_SPREAD = 150
const FAN_COUNT = 8
const GRID_VERTICAL = '#6df7ea'
const GRID_HORIZONTAL = '#ff4fd8'
const HORIZONTALS = [
  { y: 500, width: 1.5, opacity: 0.1 },
  { y: 503.6, width: 1.5, opacity: 0.14 },
  { y: 513.6, width: 2, opacity: 0.18 },
  { y: 530.6, width: 2, opacity: 0.22 },
  { y: 554.6, width: 2, opacity: 0.24 },
  { y: 587, width: 2, opacity: 0.24 },
  { y: 625.5, width: 2, opacity: 0.24 },
]

const LOGO_SIZE = 300
const LOGO_LEFT = 870
const LOGO_TOP = 330

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const escapeXml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const wrapTitle = (title: string, budget = WRAP_BUDGET) => {
  const lines: string[] = []
  let line = ''
  for (const word of title.split(' ')) {
    const joined = line === '' ? word : `${line} ${word}`
    if (joined.length > budget && line !== '') {
      lines.push(line)
      line = word
      continue
    }
    line = joined
  }
  lines.push(line)
  return lines
}

const paperLabel = (createdAt: string) => {
  const month = MONTHS[Number(createdAt.slice(5, 7)) - 1]
  return `paper // ${month} ${createdAt.slice(0, 4)}`
}

const fanLines = () => {
  const lines = []
  for (let n = -FAN_COUNT; n <= FAN_COUNT; n++) {
    const x = APEX_X + FAN_SPREAD * n
    lines.push(
      `<line x1="${APEX_X}" y1="${APEX_Y}" x2="${x}" y2="${HEIGHT}" stroke="${GRID_VERTICAL}" stroke-width="2" stroke-opacity="0.16"/>`,
    )
  }
  return lines.join('')
}

const horizonLines = () =>
  HORIZONTALS.map(
    ({ y, width, opacity }) =>
      `<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" stroke="${GRID_HORIZONTAL}" stroke-width="${width}" stroke-opacity="${opacity}"/>`,
  ).join('')

const horizonGlow = () =>
  `<line x1="0" y1="${APEX_Y}" x2="${WIDTH}" y2="${APEX_Y}" stroke="${GRID_VERTICAL}" stroke-width="9" stroke-opacity="0.3" filter="url(#horizon-blur)"/>
  <line x1="0" y1="${APEX_Y}" x2="${WIDTH}" y2="${APEX_Y}" stroke="${GRID_VERTICAL}" stroke-width="1.5" stroke-opacity="0.45"/>`

const titleText = (lines: string[], font?: string) => {
  const first =
    TITLE_CENTER_BASELINE - (TITLE_LINE_PITCH / 2) * (lines.length - 1)
  const family = font ? ` font-family="${font}"` : ''
  return lines
    .map(
      (line, index) =>
        `<text x="${MARGIN}" y="${first + TITLE_LINE_PITCH * index}" font-size="${TITLE_SIZE}" fill="#ffffff"${family}>${escapeXml(line)}</text>`,
    )
    .join('')
}

const underline = (lines: string[]) => {
  const top = 321 + (TITLE_LINE_PITCH / 2) * (lines.length - 1)
  return `<rect x="${MARGIN}" y="${top}" width="220" height="6" fill="url(#stripe)"/>`
}

export type CardSpec = Pick<Metadata, 'title' | 'createdAt'> & {
  /** Overrides the headline face only, so the card chrome never changes. */
  titleFont?: string
  wrapBudget?: number
}

export const buildCard = ({
  title,
  createdAt,
  titleFont,
  wrapBudget,
}: CardSpec) => {
  const lines = wrapTitle(title, wrapBudget)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="VCR OSD Mono">
  <defs>
    <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="1050" cy="80" r="700" gradientTransform="scale(1 0.5)">
      <stop offset="0" stop-color="#4d104f" stop-opacity="0.87"/>
      <stop offset="1" stop-color="#4d104f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ed4fb9"/>
      <stop offset="1" stop-color="#6df7ea"/>
    </linearGradient>
    <filter id="horizon-blur" x="-5%" y="-500%" width="110%" height="1100%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0f131c"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <path d="M1006 25 L1008.5 32.5 L1016 35 L1008.5 37.5 L1006 45 L1003.5 37.5 L996 35 L1003.5 32.5 Z" fill="#4a104d"/>
  ${fanLines()}
  ${horizonLines()}
  ${horizonGlow()}
  <text x="${MARGIN}" y="120" font-size="30" fill="#6df7ea">sospedra.me</text>
  <text x="${MARGIN}" y="160" font-size="22" fill="#a8aaae">${paperLabel(createdAt)}</text>
  ${titleText(lines, titleFont)}
  ${underline(lines)}
</svg>`
}

// isolate font resolution to the repo woff2 so any machine renders the same card
const configureFonts = async () => {
  const dir = join(tmpdir(), 'sospedra-og')
  await mkdir(join(dir, 'cache'), { recursive: true })
  const config = join(dir, 'fonts.conf')
  await writeFile(
    config,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${absolute('public/fonts')}</dir>
  <cachedir>${join(dir, 'cache')}</cachedir>
</fontconfig>
`,
  )
  process.env.FONTCONFIG_FILE = config
}

let logoOverlay: Buffer | undefined

const logo = async () => {
  logoOverlay ??= await sharp(absolute('public/sospedra.png'))
    .resize(LOGO_SIZE)
    .toBuffer()
  return logoOverlay
}

const renderCard = async (
  slug: string,
  locale: ReaderLocale,
  spec: CardSpec,
) => {
  const output = absolute(join('public', paperCardPath(slug, locale)))
  await mkdir(dirname(output), { recursive: true })
  await sharp(Buffer.from(buildCard(spec)))
    .composite([{ input: await logo(), left: LOGO_LEFT, top: LOGO_TOP }])
    .png({ palette: true, compressionLevel: 9 })
    .toFile(output)
}

const translatedSpecs = async (slug: string, createdAt: string) => {
  const locales = localesOf(slug)
  if (locales.length === 0) return []
  const module = await import(
    absolute(join('repo/papers', slug, 'i18n.ts'))
  ).catch(() => null)
  const translations = module?.default
  if (!translations) return []
  return locales
    .filter((locale) => translations[locale])
    .map((locale) => ({
      locale,
      spec: {
        title: translations[locale].title,
        createdAt,
        titleFont: TITLE_FONT[locale],
        wrapBudget: WRAP_BUDGETS[locale],
      } satisfies CardSpec,
    }))
}

export default async function og(metafile: string) {
  const { title, createdAt } = await readJson<Partial<Metadata>>(metafile, {})
  if (!title || !createdAt) return

  await configureFonts()
  const slug = slugFromPaperFile(metafile)
  await renderCard(slug, DEFAULT_LOCALE, { title, createdAt })
  for (const { locale, spec } of await translatedSpecs(slug, createdAt)) {
    await renderCard(slug, locale, spec)
  }

  return updatePaperMetadata(slug, (current) => ({
    ...current,
    og: paperCardPath(slug, DEFAULT_LOCALE),
  }))
}
