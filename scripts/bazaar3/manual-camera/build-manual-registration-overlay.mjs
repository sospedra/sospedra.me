import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(
  ROOT,
  'scripts/bazaar3/manual-camera/manifests/manual-calibration.json',
)
const OUTPUT_PATH = path.join(
  ROOT,
  'scripts/bazaar3/manual-camera/artifacts/manual-design-registration-overlay-960x1264.png',
)

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
const manifestDirectory = path.dirname(MANIFEST_PATH)
const baseDescriptor = manifest.frames.find(
  (frame) => frame.id === manifest.baseState,
)
const basePath = path.resolve(manifestDirectory, baseDescriptor.file)
const scale = manifest.pixelScale

const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const shapeForZone = (zone) => {
  const color = zone.color ?? '#55d6ff'
  if (zone.kind === 'polygon') {
    const points = zone.points
      .map(([x, y]) => `${x * scale},${y * scale}`)
      .join(' ')
    const [labelX, labelY] = zone.points[0]
    return `
      <polygon points="${points}" fill="${color}" fill-opacity=".10" stroke="${color}" stroke-width="4" stroke-dasharray="12 8"/>
      <text x="${labelX * scale + 7}" y="${labelY * scale + 21}" fill="${color}" font-family="monospace" font-size="17" font-weight="700">${escapeXml(zone.id)}</text>
    `
  }
  if (zone.kind === 'cross') {
    const x = zone.x * scale
    const y = zone.y * scale
    const radius = (zone.size ?? 7) * scale
    return `
      <circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${color}" stroke-width="4"/>
      <line x1="${x - radius}" y1="${y}" x2="${x + radius}" y2="${y}" stroke="${color}" stroke-width="4"/>
      <line x1="${x}" y1="${y - radius}" x2="${x}" y2="${y + radius}" stroke="${color}" stroke-width="4"/>
      <text x="${x + radius + 7}" y="${y - 7}" fill="${color}" font-family="monospace" font-size="17" font-weight="700">${escapeXml(zone.id)}</text>
    `
  }

  const x = zone.x * scale
  const y = zone.y * scale
  const width = zone.width * scale
  const height = zone.height * scale
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" fill-opacity=".09" stroke="${color}" stroke-width="4" stroke-dasharray="12 8"/>
    <text x="${x + 7}" y="${y + 21}" fill="${color}" font-family="monospace" font-size="17" font-weight="700">${escapeXml(zone.id)}</text>
  `
}

const zoneSvg = manifest.designReviewZones.map(shapeForZone).join('')
const overlay = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${manifest.deliveryCanvas.width}" height="${manifest.deliveryCanvas.height}">
    <rect width="100%" height="100%" fill="#05080c" fill-opacity=".22"/>
    ${zoneSvg}
    <rect x="0" y="0" width="${manifest.deliveryCanvas.width}" height="54" fill="#05080c" fill-opacity=".88"/>
    <text x="16" y="23" fill="#f5ead4" font-family="monospace" font-size="18" font-weight="700">MANUAL DESIGN-MASTER REGISTRATION • 320×421 LOGICAL / 960×1264 DELIVERY</text>
    <text x="16" y="45" fill="#8feee4" font-family="monospace" font-size="15">POSITIONING REVIEW ONLY • animation masks remain separately enforced</text>
  </svg>
`)

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
await sharp(basePath)
  .composite([{ input: overlay, left: 0, top: 0 }])
  .png()
  .toFile(OUTPUT_PATH)

console.log(path.relative(ROOT, OUTPUT_PATH))
