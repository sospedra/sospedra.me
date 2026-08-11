import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

/*
 * One-shot migration from the b64-in-JSON terrain container (v1) to the
 * v2 pair: terrain.json (meta, delta polylines) + terrain.bin (gzip of
 * delta-encoded u16 grids). The v1 input lives in git history at commit
 * b0679005 (public/cims/terrain.json).
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const input = process.argv[2] ?? `${ROOT}public/cims/terrain.json`

type ContourLevel = { lv: number; mj: 0 | 1; p: number[][] }
type V1Grid = { b64: string; [key: string]: unknown }
type V1 = {
  grid: number
  base: V1Grid & { nx: number; nz: number }
  mountains: Array<V1Grid & { contours: ContourLevel[] }>
  contours: ContourLevel[]
  rivers: Array<{ id: string; p: number[] }>
  borders: unknown
  cities: unknown
}

const data = JSON.parse(readFileSync(input, 'utf8')) as V1
if (!data.base?.b64) throw new Error('input is not the v1 b64 terrain format')

const cellsOf = (b64: string): Uint16Array => {
  const bytes = Uint8Array.from(Buffer.from(b64, 'base64'))
  return new Uint16Array(bytes.buffer)
}

const deltaGrid = (cells: Uint16Array): Uint16Array => {
  const out = new Uint16Array(cells.length)
  out[0] = cells[0]
  for (let i = 1; i < cells.length; i++) out[i] = cells[i] - cells[i - 1]
  return out
}

const deltaPairs = (p: number[]): number[] => {
  const out = new Array<number>(p.length)
  let x = 0
  let z = 0
  for (let i = 0; i < p.length; i += 2) {
    out[i] = p[i] - x
    out[i + 1] = p[i + 1] - z
    x = p[i]
    z = p[i + 1]
  }
  return out
}

const deltaContours = (levels: ContourLevel[]): ContourLevel[] =>
  levels.map((level) => ({ ...level, p: level.p.map(deltaPairs) }))

const stripB64 = ({ b64, ...spec }: V1Grid) => spec

const grids = [
  cellsOf(data.base.b64),
  ...data.mountains.map((mountain) => cellsOf(mountain.b64)),
]
const blob = Buffer.concat(
  grids.map((cells) => Buffer.from(deltaGrid(cells).buffer)),
)
const bin = gzipSync(blob, { level: 9 })

const meta = {
  v: 2,
  grid: data.grid,
  base: stripB64(data.base),
  mountains: data.mountains.map((mountain) => ({
    ...stripB64(mountain),
    contours: deltaContours(mountain.contours),
  })),
  borders: data.borders,
  cities: data.cities,
  contours: deltaContours(data.contours),
  rivers: data.rivers.map((river) => ({ ...river, p: deltaPairs(river.p) })),
}

writeFileSync(`${ROOT}public/cims/terrain.bin`, bin)
writeFileSync(`${ROOT}public/cims/terrain.json`, JSON.stringify(meta))
const mb = (n: number) => `${(n / 1e6).toFixed(2)} MB`
console.log(`terrain.bin ${mb(bin.length)} (grids raw ${mb(blob.length)})`)
console.log(`terrain.json ${mb(JSON.stringify(meta).length)}`)
