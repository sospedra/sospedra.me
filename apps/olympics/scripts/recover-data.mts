/**
 * One-shot data recovery for the Tokyo 2020 snapshot.
 *
 * The original app scraped olympics.com/tokyo-2020 at build time.
 * That subsite is offline, so this script rebuilds the same dataset
 * from the Wayback Machine and writes it to data/*.json.
 * The games ended on 2021-08-08. The dataset is final.
 *
 * Run from apps/olympics: node scripts/recover-data.mts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { load } from 'cheerio'

const CACHE_DIR = new URL('.cache/', import.meta.url)
const DATA_DIR = new URL('../data/', import.meta.url)
const BASE = 'https://olympics.com/tokyo-2020/olympic-games/en/results'
// nearest-capture resolution against a dead site is stable
const DEFAULT_PIN = '20210901000000'
// the nearest capture to the default pin returns 403 for athletics
const PINS: Record<string, string> = { athletics: '20210926135443' }
const MEDALS_CAPTURE = '2021-08-31T23:31:45.000Z'
const SPORTS = [
  'archery',
  'athletics',
  'canoe-sprint',
  'cycling-track',
  'modern-pentathlon',
  'rowing',
  'shooting',
  'sport-climbing',
  'swimming',
  'weightlifting',
]

const fetchPage = async (name: string, url: string) => {
  const cached = new URL(`${name}.html`, CACHE_DIR)
  const fromCache = await readFile(cached, 'utf8').catch(() => null)
  if (fromCache) return fromCache

  const pin = PINS[name] ?? DEFAULT_PIN
  const response = await fetch(`https://web.archive.org/web/${pin}id_/${url}`)
  if (!response.ok) {
    throw new Error(`wayback ${response.status} for ${name}`)
  }
  const html = await response.text()
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(cached, html)
  return html
}

const parseMedals = (html: string) => {
  const $ = load(html)
  const rows = $('table').first().find('tr').toArray()

  return rows.flatMap((row) => {
    const cells = $(row).find('td')
    if (cells.length < 8) return []

    const numberAt = (index: number) => {
      const value = Number.parseInt(cells.eq(index).text().trim(), 10)
      if (Number.isNaN(value)) {
        throw new Error(`non-numeric cell ${index}: ${cells.eq(index).text()}`)
      }
      return value
    }

    return [
      {
        name: cells.eq(1).text().trim(),
        noc: cells.eq(7).text().trim(),
        gold: numberAt(2),
        silver: numberAt(3),
        bronze: numberAt(4),
        classicRank: numberAt(0),
      },
    ]
  })
}

const parseRecords = (html: string) => {
  const $ = load(html)
  const rows = $('table').first().find('tr').toArray()

  return rows.flatMap((row) => {
    const cells = $(row).find('td')
    if (cells.length === 0) return []

    const type = cells.eq(1).text().trim()
    const nameCell = cells.eq(2)
    const isNew = nameCell.find('.badge').text().trim() === 'New'
    const noc = nameCell.find('abbr.noc').first().text().trim()
    if (!isNew || (type !== 'WR' && type !== 'OR')) return []
    if (!/^[A-Z]{3}$/.test(noc)) {
      throw new Error(`bad NOC "${noc}" on a new ${type} row`)
    }

    return [{ type, noc }]
  })
}

const writeJson = async (name: string, value: unknown) => {
  const target = new URL(name, DATA_DIR)
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`)
  console.log(`wrote data/${name}`)
}

const medalsHtml = await fetchPage(
  'medal-standings',
  `${BASE}/all-sports/medal-standings.htm`,
)
const medals = parseMedals(medalsHtml)
if (medals.length !== 93) {
  throw new Error(`expected 93 NOCs, got ${medals.length}`)
}

const records = []
for (const sport of SPORTS) {
  const html = await fetchPage(sport, `${BASE}/${sport}/records.htm`)
  const found = parseRecords(html)
  console.log(`${sport}: ${found.length} new records`)
  records.push(...found)
}

await mkdir(DATA_DIR, { recursive: true })
await writeJson('medals.json', medals)
await writeJson('records.json', records)
await writeJson('meta.json', { updatedAt: MEDALS_CAPTURE })
