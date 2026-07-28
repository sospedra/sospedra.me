import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUTPUT_ROOT = path.join(ROOT, 'public/images/bazaar3/assets/environment')
const PROP_ROOT = path.join(ROOT, 'public/images/bazaar3/assets/props-v3')
const ARCHITECTURE_ROOT = path.join(
  ROOT,
  'public/images/bazaar3/assets/architecture',
)
const REPORT_ROOT = path.join(
  ROOT,
  'scripts/bazaar3/reports/floor-environments',
)

const PIXEL_SCALE = 3
const FLOOR_LOGICAL = Object.freeze({ width: 416, height: 199 })
const FLOOR_DELIVERED = Object.freeze({
  width: FLOOR_LOGICAL.width * PIXEL_SCALE,
  height: FLOOR_LOGICAL.height * PIXEL_SCALE,
})

const PALETTE = Object.freeze({
  void: '#020307',
  deepest: '#080c12',
  shadow: '#111923',
  steelDark: '#1c2731',
  steel: '#2b3741',
  steelLight: '#414c55',
  edge: '#606970',
  worn: '#898e8d',
  parchmentDark: '#4b4236',
  parchment: '#a38b69',
  rustDark: '#321a0f',
  rust: '#6b391c',
  rustLight: '#bd7133',
  redDark: '#5c171c',
  red: '#b83932',
  purpleDark: '#2a1e38',
  purple: '#674870',
  cyanDark: '#0a2942',
  cyan: '#126e9b',
  cyanLight: '#4bd2e1',
  tealDark: '#0e3534',
  teal: '#267c73',
  tealLight: '#56b4a4',
  greenDark: '#1e2d14',
  green: '#4b6220',
  greenLight: '#95a247',
  amberDark: '#7b4514',
  amber: '#df9e32',
  amberLight: '#ffd26b',
  clayDark: '#542b22',
  clay: '#ad6744',
  clayLight: '#efbd82',
  hologram: '#8be9e7',
})

const FLOOR_THEMES = Object.freeze({
  archive: {
    bay: PALETTE.shadow,
    bayInset: PALETTE.deepest,
    service: PALETTE.cyanDark,
    serviceEdge: PALETTE.cyan,
    wear: PALETTE.rust,
    marker: PALETTE.parchment,
    lowerWall: PALETTE.steelDark,
    floor: PALETTE.steel,
  },
  workshop: {
    bay: PALETTE.shadow,
    bayInset: PALETTE.deepest,
    service: PALETTE.steelDark,
    serviceEdge: PALETTE.teal,
    wear: PALETTE.rustLight,
    marker: PALETTE.amber,
    lowerWall: PALETTE.steelDark,
    floor: PALETTE.steel,
  },
  reclaimed: {
    bay: PALETTE.shadow,
    bayInset: PALETTE.deepest,
    service: PALETTE.greenDark,
    serviceEdge: PALETTE.green,
    wear: PALETTE.clay,
    marker: PALETTE.purple,
    lowerWall: PALETTE.tealDark,
    floor: PALETTE.steel,
  },
})

const escapeXml = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')

function svgDocument({ width, height, body }) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
      shape-rendering="crispEdges">
      ${body}
    </svg>
  `)
}

function rect(x, y, width, height, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${escapeXml(fill)}" ${extra}/>`
}

function polygon(points, fill, extra = '') {
  return `<polygon points="${points}" fill="${escapeXml(fill)}" ${extra}/>`
}

function pathShape(d, fill, extra = '') {
  return `<path d="${d}" fill="${escapeXml(fill)}" ${extra}/>`
}

function circle(cx, cy, radius, fill) {
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${escapeXml(fill)}"/>`
}

function commonFloorBody(theme, floorId) {
  const wallPanels = Array.from({ length: 4 }, (_, index) => {
    const x = index * 104
    const inset = index % 2 === 0 ? 11 : 7
    const upperY = index % 2 === 0 ? 40 : 36
    const lowerY = index % 2 === 0 ? 92 : 96
    return `
      ${rect(x, 12, 5, 138, PALETTE.void)}
      ${rect(x + 5, 12, 3, 138, PALETTE.steel)}
      ${rect(x + inset, upperY, 88, 46, theme.bay)}
      ${rect(x + inset + 4, upperY + 4, 80, 38, theme.bayInset)}
      ${rect(x + inset, lowerY, 88, 45, theme.lowerWall)}
      ${rect(x + inset + 4, lowerY + 4, 80, 37, theme.bay)}
      ${rect(x + 14, 20, 73, 4, PALETTE.void)}
      ${rect(x + 14, 24, 73, 3, theme.service)}
      ${rect(x + 14, 27, 73, 2, theme.serviceEdge)}
      ${circle(x + 13, upperY + 5, 2, PALETTE.edge)}
      ${circle(x + 91, upperY + 5, 2, PALETTE.edge)}
      ${circle(x + 13, lowerY + 39, 2, PALETTE.steel)}
      ${circle(x + 91, lowerY + 39, 2, PALETTE.steel)}
    `
  }).join('')

  const floorSlabs = Array.from({ length: 8 }, (_, index) => {
    const x = index * 52
    const offset = index % 2 === 0 ? 0 : 8
    return `
      ${polygon(
        `${x},157 ${x + 51},157 ${x + 43 + offset},176 ${Math.max(0, x - 8 + offset)},176`,
        index % 2 === 0 ? theme.floor : PALETTE.steelDark,
      )}
      ${polygon(
        `${Math.max(0, x - 8 + offset)},187 ${x + 43 + offset},187 ${x + 51},198 ${x},198`,
        index % 2 === 0 ? PALETTE.steelDark : theme.floor,
      )}
    `
  }).join('')

  const themeMarks =
    floorId === 'archive'
      ? `
        ${rect(42, 48, 12, 3, theme.marker)}
        ${rect(58, 48, 6, 3, PALETTE.parchmentDark)}
        ${rect(250, 107, 16, 3, theme.marker)}
        ${rect(270, 107, 7, 3, PALETTE.parchmentDark)}
        ${pathShape('M96 139H117V142H108V146H99V143H96Z', PALETTE.cyan)}
        ${pathShape('M305 69H326V72H319V76H308V73H305Z', PALETTE.cyanDark)}
      `
      : floorId === 'workshop'
        ? `
          ${rect(52, 50, 22, 4, theme.marker)}
          ${rect(58, 54, 4, 7, PALETTE.amberDark)}
          ${rect(286, 119, 26, 4, theme.serviceEdge)}
          ${rect(308, 111, 4, 12, theme.service)}
          ${pathShape('M162 31H170V43H177V47H166V44H158V36H162Z', PALETTE.teal)}
          ${pathShape('M370 83H383V86H379V91H372V88H370Z', PALETTE.rustLight)}
        `
        : `
          ${pathShape('M28 143H39V138H47V134H52V138H47V143H41V150H28Z', PALETTE.green)}
          ${pathShape('M164 146H176V141H181V135H185V145H180V150H164Z', PALETTE.greenDark)}
          ${pathShape('M330 145H339V138H347V132H351V142H346V148H330Z', PALETTE.green)}
          ${rect(78, 67, 18, 3, theme.marker)}
          ${rect(291, 48, 12, 3, PALETTE.purpleDark)}
          ${circle(387, 126, 3, PALETTE.purple)}
        `

  return `
    ${rect(0, 0, 416, 199, PALETTE.deepest)}
    ${rect(0, 0, 416, 12, PALETTE.void)}
    ${rect(0, 3, 416, 3, PALETTE.steelLight)}
    ${rect(0, 6, 416, 3, PALETTE.steelDark)}
    ${wallPanels}
    ${rect(0, 31, 416, 5, PALETTE.void)}
    ${rect(0, 32, 416, 2, PALETTE.steelLight)}
    ${rect(0, 147, 416, 7, PALETTE.void)}
    ${rect(0, 147, 416, 2, PALETTE.edge)}
    ${rect(0, 154, 416, 45, theme.floor)}
    ${floorSlabs}
    ${rect(0, 176, 416, 11, PALETTE.void)}
    ${rect(0, 176, 416, 2, PALETTE.steelLight)}
    ${Array.from({ length: 52 }, (_, index) =>
      rect(index * 8 + 2, 179, 3, 6, PALETTE.steel),
    ).join('')}
    ${rect(0, 185, 416, 2, PALETTE.steel)}
    ${rect(0, 197, 416, 2, PALETTE.void)}
    ${pathShape('M12 168H31V171H24V174H16V172H12Z', theme.wear)}
    ${pathShape('M205 191H223V194H217V196H209V194H205Z', PALETTE.rust)}
    ${pathShape('M378 161H405V164H397V167H385V165H378Z', theme.wear)}
    ${themeMarks}
  `
}

const PROP_SPECS = Object.freeze({
  'archive-return-cart': {
    width: 96,
    height: 72,
    body: `
      ${rect(8, 20, 72, 39, PALETTE.void)}
      ${polygon('12,16 78,16 88,24 20,24', PALETTE.parchmentDark)}
      ${polygon('20,24 88,24 80,56 12,56', PALETTE.rustDark)}
      ${rect(18, 29, 58, 21, PALETTE.parchmentDark)}
      ${rect(22, 32, 25, 4, PALETTE.parchment)}
      ${rect(50, 32, 20, 4, PALETTE.cyanDark)}
      ${rect(22, 40, 45, 3, PALETTE.parchment)}
      ${rect(6, 54, 82, 6, PALETTE.void)}
      ${circle(20, 64, 7, PALETTE.void)}
      ${circle(73, 64, 7, PALETTE.void)}
      ${circle(20, 64, 3, PALETTE.steelLight)}
      ${circle(73, 64, 3, PALETTE.steelLight)}
    `,
  },
  'ramen-service-pipe': {
    width: 84,
    height: 118,
    body: `
      ${rect(29, 0, 16, 86, PALETTE.void)}
      ${rect(33, 0, 8, 86, PALETTE.steel)}
      ${rect(33, 8, 8, 5, PALETTE.rustLight)}
      ${rect(33, 46, 8, 5, PALETTE.rust)}
      ${pathShape('M33 78H72V86H41V103H33Z', PALETTE.void)}
      ${pathShape('M37 81H68V84H39V99H37Z', PALETTE.rustLight)}
      ${circle(70, 83, 10, PALETTE.void)}
      ${circle(70, 83, 6, PALETTE.red)}
      ${rect(68, 69, 4, 28, PALETTE.void)}
      ${rect(56, 81, 28, 4, PALETTE.void)}
      ${circle(70, 83, 3, PALETTE.amber)}
    `,
  },
  'archive-tube-bundle': {
    width: 100,
    height: 54,
    body: `
      ${rect(4, 34, 89, 8, PALETTE.void)}
      ${rect(8, 31, 82, 6, PALETTE.steelDark)}
      ${pathShape('M14 31V17H25V31M33 31V8H44V31M52 31V14H63V31M71 31V4H82V31', 'none', `stroke="${PALETTE.void}" stroke-width="5"`)}
      ${pathShape('M16 31V19H23V31M35 31V10H42V31M54 31V16H61V31M73 31V6H80V31', 'none', `stroke="${PALETTE.cyan}" stroke-width="3"`)}
      ${rect(0, 41, 97, 7, PALETTE.void)}
      ${rect(7, 42, 83, 3, PALETTE.steelLight)}
    `,
  },
  'manual-scrap-crates': {
    width: 128,
    height: 91,
    body: `
      ${polygon('3,36 58,27 75,39 20,49', PALETTE.void)}
      ${polygon('8,36 57,30 68,38 20,45', PALETTE.clay)}
      ${rect(13, 45, 61, 37, PALETTE.void)}
      ${rect(18, 48, 51, 29, PALETTE.rustDark)}
      ${pathShape('M23 60H33V50H40V67H49V54H57V70H64V75H23Z', PALETTE.steel)}
      ${circle(30, 52, 6, PALETTE.edge)}
      ${circle(54, 49, 5, PALETTE.rustLight)}
      ${polygon('68,45 117,38 126,49 78,58', PALETTE.void)}
      ${polygon('73,45 115,41 120,48 79,54', PALETTE.steelDark)}
      ${rect(76, 54, 48, 31, PALETTE.void)}
      ${rect(81, 57, 38, 23, PALETTE.steelDark)}
      ${circle(91, 64, 7, PALETTE.rustLight)}
      ${rect(101, 60, 12, 18, PALETTE.edge)}
    `,
  },
  'server-cable-tray': {
    width: 132,
    height: 66,
    body: `
      ${rect(4, 12, 124, 12, PALETTE.void)}
      ${rect(9, 15, 114, 5, PALETTE.steel)}
      ${Array.from({ length: 9 }, (_, index) =>
        pathShape(
          `M${14 + index * 12} 20V${34 + (index % 3) * 6}H${20 + index * 12}V${49 + (index % 2) * 8}`,
          'none',
          `stroke="${index % 2 === 0 ? PALETTE.teal : PALETTE.rustLight}" stroke-width="4"`,
        ),
      ).join('')}
      ${rect(0, 8, 10, 21, PALETTE.void)}
      ${rect(122, 8, 10, 21, PALETTE.void)}
      ${rect(2, 10, 6, 17, PALETTE.steelLight)}
      ${rect(124, 10, 6, 17, PALETTE.steelLight)}
    `,
  },
  'vhs-return-stack': {
    width: 82,
    height: 77,
    body: `
      ${rect(8, 51, 68, 17, PALETTE.void)}
      ${rect(13, 54, 58, 11, PALETTE.clayDark)}
      ${rect(16, 24, 54, 14, PALETTE.void)}
      ${rect(20, 27, 46, 8, PALETTE.purple)}
      ${rect(2, 39, 63, 14, PALETTE.void)}
      ${rect(6, 42, 55, 8, PALETTE.cyanDark)}
      ${rect(25, 10, 52, 14, PALETTE.void)}
      ${rect(29, 13, 44, 8, PALETTE.redDark)}
      ${rect(17, 57, 20, 3, PALETTE.parchment)}
      ${rect(27, 30, 17, 2, PALETTE.parchment)}
      ${circle(20, 72, 5, PALETTE.void)}
      ${circle(66, 72, 5, PALETTE.void)}
    `,
  },
  'root-drain': {
    width: 154,
    height: 49,
    body: `
      ${rect(3, 27, 147, 13, PALETTE.void)}
      ${rect(8, 29, 137, 7, PALETTE.steelDark)}
      ${Array.from({ length: 15 }, (_, index) =>
        rect(11 + index * 9, 30, 3, 5, PALETTE.steelLight),
      ).join('')}
      ${pathShape('M18 27V18H33V13H45V5H54V12H47V18H36V23H29V27Z', PALETTE.green)}
      ${pathShape('M93 27V19H105V14H117V8H124V16H112V22H102V27Z', PALETTE.greenDark)}
      ${circle(53, 10, 4, PALETTE.greenLight)}
      ${circle(124, 13, 3, PALETTE.purple)}
      ${rect(0, 40, 154, 5, PALETTE.void)}
    `,
  },
  'games-stock-crates': {
    width: 134,
    height: 92,
    body: `
      ${polygon('4,34 62,26 75,36 18,46', PALETTE.void)}
      ${polygon('9,34 60,29 68,35 19,42', PALETTE.clay)}
      ${rect(13, 42, 60, 40, PALETTE.void)}
      ${rect(18, 46, 50, 31, PALETTE.cyanDark)}
      ${rect(22, 51, 16, 22, PALETTE.red)}
      ${rect(42, 51, 20, 9, PALETTE.amber)}
      ${rect(42, 64, 20, 9, PALETTE.purple)}
      ${polygon('72,47 126,39 132,49 80,58', PALETTE.void)}
      ${polygon('77,47 123,42 127,48 81,54', PALETTE.parchmentDark)}
      ${rect(78, 54, 51, 30, PALETTE.void)}
      ${rect(83, 58, 41, 21, PALETTE.rustDark)}
      ${circle(94, 67, 8, PALETTE.steel)}
      ${circle(114, 67, 8, PALETTE.steel)}
      ${circle(94, 67, 3, PALETTE.cyanLight)}
      ${circle(114, 67, 3, PALETTE.red)}
    `,
  },
  'travel-queue-posts': {
    width: 144,
    height: 99,
    body: `
      ${rect(18, 18, 10, 62, PALETTE.void)}
      ${rect(21, 20, 4, 58, PALETTE.amberDark)}
      ${circle(23, 17, 10, PALETTE.void)}
      ${circle(23, 17, 6, PALETTE.amber)}
      ${rect(112, 18, 10, 62, PALETTE.void)}
      ${rect(115, 20, 4, 58, PALETTE.amberDark)}
      ${circle(117, 17, 10, PALETTE.void)}
      ${circle(117, 17, 6, PALETTE.amber)}
      ${pathShape('M28 27H112V38H28Z', PALETTE.void)}
      ${pathShape('M28 30H112V35H28Z', PALETTE.red)}
      ${polygon('6,79 39,79 48,91 0,91', PALETTE.void)}
      ${polygon('101,79 134,79 144,91 95,91', PALETTE.void)}
      ${rect(40, 69, 57, 7, PALETTE.void)}
      ${pathShape('M44 70H58V73H65V70H80V73H94V75H44Z', PALETTE.parchment)}
    `,
  },
})

const ARCHITECTURE_SPECS = Object.freeze({
  'h-beam-horizontal': {
    width: 96,
    height: 18,
    body: `
      ${rect(0, 0, 96, 18, PALETTE.void)}
      ${rect(0, 2, 96, 5, PALETTE.steel)}
      ${rect(0, 3, 96, 2, PALETTE.edge)}
      ${rect(0, 7, 96, 4, PALETTE.steelDark)}
      ${rect(0, 8, 96, 2, PALETTE.shadow)}
      ${rect(0, 11, 96, 5, PALETTE.steel)}
      ${rect(0, 12, 96, 2, PALETTE.steelLight)}
      ${rect(0, 16, 96, 2, PALETTE.void)}
      ${rect(10, 3, 7, 2, PALETTE.rust)}
      ${rect(59, 12, 9, 2, PALETTE.rustLight)}
      ${circle(5, 9, 1, PALETTE.worn)}
      ${circle(48, 9, 1, PALETTE.worn)}
      ${circle(91, 9, 1, PALETTE.worn)}
    `,
  },
  'h-beam-vertical': {
    width: 18,
    height: 96,
    body: `
      ${rect(0, 0, 18, 96, PALETTE.void)}
      ${rect(2, 0, 5, 96, PALETTE.steel)}
      ${rect(3, 0, 2, 96, PALETTE.edge)}
      ${rect(7, 0, 4, 96, PALETTE.steelDark)}
      ${rect(8, 0, 2, 96, PALETTE.shadow)}
      ${rect(11, 0, 5, 96, PALETTE.steel)}
      ${rect(12, 0, 2, 96, PALETTE.steelLight)}
      ${rect(16, 0, 2, 96, PALETTE.void)}
      ${rect(3, 15, 2, 9, PALETTE.rust)}
      ${rect(12, 61, 2, 11, PALETTE.rustLight)}
      ${circle(9, 7, 1, PALETTE.worn)}
      ${circle(9, 48, 1, PALETTE.worn)}
      ${circle(9, 89, 1, PALETTE.worn)}
    `,
  },
  'h-beam-joint': {
    width: 24,
    height: 24,
    body: `
      ${rect(0, 0, 24, 24, PALETTE.void)}
      ${rect(2, 2, 20, 20, PALETTE.steel)}
      ${rect(4, 4, 16, 16, PALETTE.steelDark)}
      ${rect(5, 5, 14, 3, PALETTE.steelLight)}
      ${rect(5, 8, 14, 11, PALETTE.shadow)}
      ${rect(6, 9, 12, 8, PALETTE.steelDark)}
      ${circle(6, 6, 2, PALETTE.void)}
      ${circle(18, 6, 2, PALETTE.void)}
      ${circle(6, 18, 2, PALETTE.void)}
      ${circle(18, 18, 2, PALETTE.void)}
      ${circle(6, 6, 1, PALETTE.worn)}
      ${circle(18, 6, 1, PALETTE.worn)}
      ${circle(6, 18, 1, PALETTE.rustLight)}
      ${circle(18, 18, 1, PALETTE.worn)}
      ${rect(11, 4, 3, 4, PALETTE.rust)}
    `,
  },
})

async function renderPng({
  logicalWidth,
  logicalHeight,
  body,
  output,
  colors,
}) {
  const logical = await sharp(
    svgDocument({
      width: logicalWidth,
      height: logicalHeight,
      body,
    }),
  )
    .ensureAlpha()
    .png({ palette: true, colors, dither: 0 })
    .toBuffer()

  const delivered = await sharp(logical)
    .resize({
      width: logicalWidth * PIXEL_SCALE,
      height: logicalHeight * PIXEL_SCALE,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ palette: true, colors, dither: 0 })
    .toBuffer()

  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, delivered)
  return delivered
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function isExactPixelGrid(data, width, height, channels) {
  for (let y = 0; y < height; y += PIXEL_SCALE) {
    for (let x = 0; x < width; x += PIXEL_SCALE) {
      const root = (y * width + x) * channels
      for (let dy = 0; dy < PIXEL_SCALE; dy += 1) {
        for (let dx = 0; dx < PIXEL_SCALE; dx += 1) {
          const offset = ((y + dy) * width + x + dx) * channels
          for (let channel = 0; channel < channels; channel += 1) {
            if (data[offset + channel] !== data[root + channel]) return false
          }
        }
      }
    }
  }
  return true
}

async function auditAsset(buffer, expectedWidth, expectedHeight) {
  const metadata = await sharp(buffer).metadata()
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const palette = new Set()
  const offPaletteColors = new Set()
  const approvedColors = new Set(
    Object.values(PALETTE).map((hex) => {
      const value = hex.slice(1)
      return `${Number.parseInt(value.slice(0, 2), 16)},${Number.parseInt(
        value.slice(2, 4),
        16,
      )},${Number.parseInt(value.slice(4, 6), 16)}`
    }),
  )
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset + 3] === 0) continue
    const rgb = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`
    palette.add(
      `${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`,
    )
    if (!approvedColors.has(rgb)) offPaletteColors.add(rgb)
  }
  return {
    dimensions:
      metadata.width === expectedWidth && metadata.height === expectedHeight,
    width: metadata.width,
    height: metadata.height,
    visibleColors: palette.size,
    exactMasterPalette: offPaletteColors.size === 0,
    offPaletteColors: [...offPaletteColors],
    exactThreePixelGrid: isExactPixelGrid(
      data,
      info.width,
      info.height,
      info.channels,
    ),
    sha256: hash(buffer),
  }
}

await mkdir(OUTPUT_ROOT, { recursive: true })
await mkdir(PROP_ROOT, { recursive: true })
await mkdir(ARCHITECTURE_ROOT, { recursive: true })
await mkdir(REPORT_ROOT, { recursive: true })

const report = {
  generatedAt: new Date().toISOString(),
  authoredPixelScale: PIXEL_SCALE,
  palette: PALETTE,
  floors: {},
  props: {},
  architecture: {},
}

for (const [floorId, theme] of Object.entries(FLOOR_THEMES)) {
  const output = path.join(OUTPUT_ROOT, `${floorId}.png`)
  const buffer = await renderPng({
    logicalWidth: FLOOR_LOGICAL.width,
    logicalHeight: FLOOR_LOGICAL.height,
    body: commonFloorBody(theme, floorId),
    output,
    colors: 40,
  })
  report.floors[floorId] = {
    output: path.relative(ROOT, output),
    logicalCanvas: FLOOR_LOGICAL,
    deliveredCanvas: FLOOR_DELIVERED,
    ...(await auditAsset(
      buffer,
      FLOOR_DELIVERED.width,
      FLOOR_DELIVERED.height,
    )),
  }
}

for (const [propId, spec] of Object.entries(PROP_SPECS)) {
  const output = path.join(PROP_ROOT, `${propId}.png`)
  const buffer = await renderPng({
    logicalWidth: spec.width,
    logicalHeight: spec.height,
    body: spec.body,
    output,
    colors: 24,
  })
  report.props[propId] = {
    output: path.relative(ROOT, output),
    logicalCanvas: { width: spec.width, height: spec.height },
    ...(await auditAsset(
      buffer,
      spec.width * PIXEL_SCALE,
      spec.height * PIXEL_SCALE,
    )),
  }
}

for (const [assetId, spec] of Object.entries(ARCHITECTURE_SPECS)) {
  const output = path.join(ARCHITECTURE_ROOT, `${assetId}.png`)
  const buffer = await renderPng({
    logicalWidth: spec.width,
    logicalHeight: spec.height,
    body: spec.body,
    output,
    colors: 16,
  })
  report.architecture[assetId] = {
    output: path.relative(ROOT, output),
    logicalCanvas: { width: spec.width, height: spec.height },
    ...(await auditAsset(
      buffer,
      spec.width * PIXEL_SCALE,
      spec.height * PIXEL_SCALE,
    )),
  }
}

const failed = [
  ...Object.values(report.floors),
  ...Object.values(report.props),
  ...Object.values(report.architecture),
].some(
  (entry) =>
    !entry.dimensions ||
    !entry.exactThreePixelGrid ||
    !entry.exactMasterPalette,
)

report.status = failed ? 'fail' : 'pass'
const reportPath = path.join(REPORT_ROOT, 'build-report.json')
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)

if (failed) {
  throw new Error(`Floor environment validation failed; see ${reportPath}`)
}

console.log(path.relative(ROOT, reportPath))
for (const floor of Object.values(report.floors)) console.log(floor.output)
for (const prop of Object.values(report.props)) console.log(prop.output)
for (const asset of Object.values(report.architecture)) {
  console.log(asset.output)
}
