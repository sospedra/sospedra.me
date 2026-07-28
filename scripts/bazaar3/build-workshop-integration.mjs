import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE_DIR = path.join(
  ROOT,
  'scripts/bazaar3/sources/integration/workshop',
)
const OUTPUT_DIR = path.join(
  ROOT,
  'public/images/bazaar3/assets/integration/floors/workshop-desktop',
)
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop',
)
const STALL_ROOT = path.join(ROOT, 'public/images/bazaar3/assets/stalls')

const LOGICAL = { width: 416, height: 199 }
const SCALE = 3
const DELIVERED = {
  width: LOGICAL.width * SCALE,
  height: LOGICAL.height * SCALE,
}

const COLORS = {
  transparent: [0, 0, 0, 0],
  void: [2, 3, 5, 255],
  shadow: [5, 7, 10, 255],
  shadowLift: [9, 13, 18, 255],
  steelDark: [17, 24, 33, 255],
  steel: [40, 50, 59, 255],
  steelLight: [70, 81, 90, 255],
  rustDark: [51, 34, 20, 255],
  rust: [96, 64, 45, 255],
  rustLight: [138, 81, 48, 255],
  amberDark: [49, 35, 20, 255],
  amber: [115, 72, 31, 255],
  amberCore: [185, 121, 56, 255],
  tealDark: [7, 27, 29, 255],
  teal: [13, 52, 54, 255],
  tealLight: [31, 86, 83, 255],
  crtDark: [12, 26, 38, 255],
  crt: [29, 54, 73, 255],
  paper: [139, 112, 70, 255],
}

const stalls = [
  {
    id: 'manual',
    src: path.join(STALL_ROOT, 'manual/frames/idle-1.png'),
    box: { left: 162, top: 137, width: 306, height: 407 },
  },
  {
    id: 'console',
    src: path.join(STALL_ROOT, 'console-v2/frames/idle-1.png'),
    box: { left: 506, top: 237, width: 251, height: 326 },
  },
  {
    id: 'talks',
    src: path.join(STALL_ROOT, 'talks/frames/idle-1.png'),
    box: { left: 794, top: 137, width: 380, height: 407 },
  },
]

function canvas() {
  return Buffer.alloc(LOGICAL.width * LOGICAL.height * 4)
}

function pixelIndex(x, y) {
  return (y * LOGICAL.width + x) * 4
}

function setPixel(buffer, x, y, color) {
  if (x < 0 || y < 0 || x >= LOGICAL.width || y >= LOGICAL.height) return
  const index = pixelIndex(x, y)
  buffer[index] = color[0]
  buffer[index + 1] = color[1]
  buffer[index + 2] = color[2]
  buffer[index + 3] = color[3]
}

function fillRect(buffer, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(buffer, px, py, color)
    }
  }
}

function strokeRect(buffer, x, y, width, height, color, thickness = 1) {
  fillRect(buffer, x, y, width, thickness, color)
  fillRect(buffer, x, y + height - thickness, width, thickness, color)
  fillRect(buffer, x, y, thickness, height, color)
  fillRect(buffer, x + width - thickness, y, thickness, height, color)
}

function fillPolygon(buffer, points, color) {
  const minimumY = Math.max(0, Math.min(...points.map((point) => point[1])))
  const maximumY = Math.min(
    LOGICAL.height - 1,
    Math.max(...points.map((point) => point[1])),
  )

  for (let y = minimumY; y <= maximumY; y += 1) {
    const intersections = []

    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index]
      const [x2, y2] = points[(index + 1) % points.length]
      if (y1 === y2) continue
      const lower = Math.min(y1, y2)
      const upper = Math.max(y1, y2)
      if (y < lower || y >= upper) continue
      intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
    }

    intersections.sort((a, b) => a - b)
    for (let index = 0; index < intersections.length; index += 2) {
      const start = Math.ceil(intersections[index])
      const end = Math.floor(intersections[index + 1] ?? intersections[index])
      for (let x = start; x <= end; x += 1) setPixel(buffer, x, y, color)
    }
  }
}

function drawLine(buffer, x0, y0, x1, y1, color, thickness = 1) {
  let currentX = x0
  let currentY = y0
  const deltaX = Math.abs(x1 - x0)
  const stepX = x0 < x1 ? 1 : -1
  const deltaY = -Math.abs(y1 - y0)
  const stepY = y0 < y1 ? 1 : -1
  let error = deltaX + deltaY

  while (true) {
    const radius = Math.floor(thickness / 2)
    fillRect(
      buffer,
      currentX - radius,
      currentY - radius,
      thickness,
      thickness,
      color,
    )
    if (currentX === x1 && currentY === y1) break
    const twiceError = 2 * error
    if (twiceError >= deltaY) {
      error += deltaY
      currentX += stepX
    }
    if (twiceError <= deltaX) {
      error += deltaX
      currentY += stepY
    }
  }
}

function drawPolyline(buffer, points, color, thickness = 1) {
  for (let index = 0; index < points.length - 1; index += 1) {
    drawLine(
      buffer,
      points[index][0],
      points[index][1],
      points[index + 1][0],
      points[index + 1][1],
      color,
      thickness,
    )
  }
}

function drawCable(buffer, points, jacket, highlight) {
  drawPolyline(buffer, points, COLORS.void, 3)
  drawPolyline(buffer, points, jacket, 1)
  for (let index = 2; index < points.length; index += 3) {
    setPixel(buffer, points[index][0], points[index][1] - 1, highlight)
  }
}

function drawPlate(buffer, x, y, width, height) {
  fillRect(buffer, x, y, width, height, COLORS.void)
  fillRect(buffer, x + 1, y + 1, width - 2, height - 2, COLORS.steelDark)
  strokeRect(buffer, x + 1, y + 1, width - 2, height - 2, COLORS.steel)
  setPixel(buffer, x + 2, y + 2, COLORS.steelLight)
  setPixel(buffer, x + width - 3, y + 2, COLORS.rust)
  setPixel(buffer, x + 2, y + height - 3, COLORS.rustDark)
}

function drawCagedLamp(buffer, x, y) {
  drawLine(buffer, x + 3, y - 5, x + 3, y, COLORS.steelDark, 2)
  fillRect(buffer, x, y, 7, 10, COLORS.void)
  fillRect(buffer, x + 1, y + 1, 5, 8, COLORS.amberDark)
  fillRect(buffer, x + 2, y + 2, 3, 5, COLORS.amberCore)
  drawLine(buffer, x + 1, y + 1, x + 1, y + 8, COLORS.steelLight)
  drawLine(buffer, x + 5, y + 1, x + 5, y + 8, COLORS.steel)
  drawLine(buffer, x, y + 3, x + 6, y + 3, COLORS.steelDark)
  drawLine(buffer, x, y + 7, x + 6, y + 7, COLORS.steelDark)
}

async function writeLogicalPlate(file, buffer, colors = 32) {
  const outputPath = path.join(OUTPUT_DIR, file)
  await sharp(buffer, {
    raw: { width: LOGICAL.width, height: LOGICAL.height, channels: 4 },
  })
    .resize({
      width: DELIVERED.width,
      height: DELIVERED.height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ palette: true, colors, dither: 0 })
    .toFile(outputPath)
  return outputPath
}

async function writeEnvironmentBase() {
  const sourcePath = path.join(
    SOURCE_DIR,
    'concept-e-environment-stair-aperture.png',
  )
  const logical = await sharp(sourcePath)
    .resize({
      width: LOGICAL.width,
      height: LOGICAL.height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ palette: true, colors: 20, dither: 0 })
    .toBuffer()
  const outputPath = path.join(OUTPUT_DIR, 'environment-base.png')
  await sharp(logical)
    .resize({
      width: DELIVERED.width,
      height: DELIVERED.height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ palette: true, colors: 20, dither: 0 })
    .toFile(outputPath)
  return outputPath
}

async function alphaBottoms(stall) {
  const logicalBox = {
    left: Math.round(stall.box.left / SCALE),
    top: Math.round(stall.box.top / SCALE),
    width: Math.round(stall.box.width / SCALE),
    height: Math.round(stall.box.height / SCALE),
  }
  const { data, info } = await sharp(stall.src)
    .resize({
      width: logicalBox.width,
      height: logicalBox.height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const bottoms = []

  for (let x = 0; x < info.width; x += 1) {
    let bottom = -1
    for (let y = info.height - 1; y >= 0; y -= 1) {
      if (data[(y * info.width + x) * 4 + 3] >= 128) {
        bottom = y
        break
      }
    }
    if (bottom >= Math.floor(info.height * 0.62)) {
      bottoms.push([logicalBox.left + x, logicalBox.top + bottom])
    }
  }

  return bottoms
}

async function writeFootprint(stall, kind) {
  const bottoms = await alphaBottoms(stall)
  const output = canvas()

  if (kind === 'caster') {
    for (let offset = 4; offset >= 1; offset -= 1) {
      const color = offset > 2 ? COLORS.shadow : COLORS.void
      for (const [x, y] of bottoms) {
        setPixel(output, x - Math.ceil(offset / 3), y + offset, color)
        if (offset <= 2) {
          setPixel(output, x - Math.ceil(offset / 3), y + offset + 1, color)
        }
      }
    }
  } else {
    for (const [x, y] of bottoms) {
      setPixel(output, x, y, COLORS.void)
      setPixel(output, x, y + 1, COLORS.void)
      setPixel(output, x - 1, y + 1, COLORS.shadow)
      setPixel(output, x + 1, y + 1, COLORS.shadow)
    }
  }

  return writeLogicalPlate(`${kind}-${stall.id}.png`, output, 8)
}

function manualRear() {
  const output = canvas()
  drawPlate(output, 52, 57, 10, 6)
  drawPlate(output, 149, 72, 10, 7)
  drawPolyline(
    output,
    [
      [154, 39],
      [154, 62],
      [147, 62],
      [147, 80],
    ],
    COLORS.void,
    4,
  )
  drawPolyline(
    output,
    [
      [154, 39],
      [154, 62],
      [147, 62],
      [147, 80],
    ],
    COLORS.steel,
    2,
  )
  drawLine(output, 154, 40, 154, 60, COLORS.steelLight)
  return output
}

function manualFront() {
  const output = canvas()
  drawCable(
    output,
    [
      [151, 170],
      [157, 174],
      [164, 174],
      [164, 180],
      [177, 183],
      [188, 188],
    ],
    COLORS.rust,
    COLORS.rustLight,
  )
  drawPlate(output, 185, 185, 8, 5)
  return output
}

function consoleRear() {
  const output = canvas()
  drawCagedLamp(output, 218, 49)
  drawPlate(output, 186, 74, 11, 8)
  drawCable(
    output,
    [
      [190, 45],
      [190, 84],
      [181, 84],
      [181, 116],
      [174, 116],
      [174, 145],
    ],
    COLORS.steel,
    COLORS.steelLight,
  )
  drawPlate(output, 226, 86, 9, 6)
  drawLine(output, 230, 44, 230, 86, COLORS.void, 4)
  drawLine(output, 230, 44, 230, 86, COLORS.steel, 2)
  return output
}

function consoleFront() {
  const output = canvas()
  drawCable(
    output,
    [
      [169, 174],
      [176, 177],
      [184, 182],
      [195, 185],
      [204, 191],
    ],
    COLORS.steelDark,
    COLORS.steel,
  )
  drawCable(
    output,
    [
      [246, 178],
      [253, 181],
      [259, 186],
      [268, 188],
    ],
    COLORS.tealDark,
    COLORS.teal,
  )
  drawPlate(output, 201, 188, 8, 5)
  drawPlate(output, 265, 185, 8, 5)
  return output
}

function talksRear() {
  const output = canvas()
  drawPolyline(
    output,
    [
      [258, 44],
      [258, 84],
      [266, 84],
      [266, 123],
    ],
    COLORS.void,
    4,
  )
  drawPolyline(
    output,
    [
      [258, 44],
      [258, 84],
      [266, 84],
      [266, 123],
    ],
    COLORS.steel,
    2,
  )
  drawLine(output, 259, 45, 259, 82, COLORS.steelLight)
  drawPlate(output, 262, 113, 10, 7)
  drawPlate(output, 389, 86, 8, 10)
  return output
}

function talksFront() {
  const output = canvas()
  fillRect(output, 259, 173, 7, 4, COLORS.void)
  fillRect(output, 260, 172, 5, 3, COLORS.paper)
  fillRect(output, 264, 179, 8, 4, COLORS.void)
  fillRect(output, 265, 178, 6, 3, COLORS.rust)
  fillRect(output, 274, 183, 7, 4, COLORS.void)
  fillRect(output, 275, 182, 5, 3, COLORS.paper)
  drawPolyline(
    output,
    [
      [389, 179],
      [397, 181],
      [404, 184],
    ],
    COLORS.void,
    4,
  )
  drawPolyline(
    output,
    [
      [389, 179],
      [397, 181],
      [404, 184],
    ],
    COLORS.steelDark,
    2,
  )
  return output
}

function manualReceiver() {
  const output = canvas()
  fillPolygon(
    output,
    [
      [50, 122],
      [145, 122],
      [162, 183],
      [43, 183],
    ],
    COLORS.amberDark,
  )
  fillPolygon(
    output,
    [
      [64, 151],
      [139, 151],
      [151, 185],
      [52, 185],
    ],
    COLORS.amber,
  )
  return output
}

function consoleReceiver() {
  const output = canvas()
  fillPolygon(
    output,
    [
      [211, 58],
      [226, 58],
      [247, 187],
      [183, 187],
    ],
    COLORS.amberDark,
  )
  fillPolygon(
    output,
    [
      [168, 125],
      [245, 125],
      [262, 191],
      [160, 191],
    ],
    COLORS.tealDark,
  )
  fillPolygon(
    output,
    [
      [178, 145],
      [238, 145],
      [250, 190],
      [169, 190],
    ],
    COLORS.teal,
  )
  return output
}

function talksReceiver() {
  const output = canvas()
  fillPolygon(
    output,
    [
      [276, 126],
      [318, 126],
      [330, 189],
      [266, 189],
    ],
    COLORS.crtDark,
  )
  fillPolygon(
    output,
    [
      [287, 146],
      [315, 146],
      [322, 188],
      [278, 188],
    ],
    COLORS.crt,
  )
  fillPolygon(
    output,
    [
      [316, 75],
      [336, 75],
      [354, 185],
      [300, 185],
    ],
    COLORS.amberDark,
  )
  return output
}

function utilityMid() {
  const output = canvas()
  drawCable(
    output,
    [
      [159, 42],
      [167, 42],
      [167, 58],
      [178, 58],
    ],
    COLORS.steelDark,
    COLORS.steel,
  )
  drawCable(
    output,
    [
      [248, 52],
      [258, 52],
      [258, 67],
      [266, 67],
    ],
    COLORS.steelDark,
    COLORS.steel,
  )
  drawPlate(output, 162, 38, 8, 6)
  drawPlate(output, 254, 48, 8, 6)
  return output
}

function frontOccluders() {
  const output = canvas()
  drawPolyline(
    output,
    [
      [112, 190],
      [146, 190],
      [151, 194],
    ],
    COLORS.void,
    4,
  )
  drawPolyline(
    output,
    [
      [112, 190],
      [146, 190],
      [151, 194],
    ],
    COLORS.steelDark,
    2,
  )
  fillRect(output, 101, 187, 3, 2, COLORS.steel)
  fillRect(output, 107, 190, 2, 2, COLORS.rust)
  fillRect(output, 284, 188, 3, 2, COLORS.paper)
  fillRect(output, 288, 191, 2, 2, COLORS.rust)
  fillRect(output, 394, 187, 10, 3, COLORS.shadow)
  fillRect(output, 395, 186, 8, 2, COLORS.steelDark)
  return output
}

function stairsRear() {
  const output = canvas()
  fillRect(output, 0, 0, 34, 13, COLORS.void)
  fillRect(output, 2, 3, 30, 8, COLORS.shadow)
  strokeRect(output, 0, 0, 34, 13, COLORS.steelDark, 2)
  drawPolyline(
    output,
    [
      [31, 7],
      [38, 7],
      [38, 31],
      [43, 31],
    ],
    COLORS.void,
    5,
  )
  drawPolyline(
    output,
    [
      [31, 7],
      [38, 7],
      [38, 31],
      [43, 31],
    ],
    COLORS.steel,
    3,
  )
  return output
}

function stairsFront() {
  const output = canvas()
  fillRect(output, 0, 180, 38, 8, COLORS.void)
  fillRect(output, 2, 181, 34, 5, COLORS.steelDark)
  for (let x = 4; x < 35; x += 5) fillRect(output, x, 182, 3, 2, COLORS.shadow)
  strokeRect(output, 0, 180, 38, 8, COLORS.steel)
  return output
}

async function analyze(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const colors = new Set()
  const alphaValues = new Set()

  for (let index = 0; index < data.length; index += info.channels) {
    colors.add(
      `${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`,
    )
    alphaValues.add(data[index + 3])
  }

  const bytes = await readFile(filePath)
  return {
    file: path.relative(ROOT, filePath),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    width: info.width,
    height: info.height,
    colors: colors.size,
    alphaValues: [...alphaValues].sort((a, b) => a - b),
  }
}

await mkdir(OUTPUT_DIR, { recursive: true })
await mkdir(REPORT_DIR, { recursive: true })

const outputs = [await writeEnvironmentBase()]

for (const [file, maker, colors] of [
  ['connections-manual-rear.png', manualRear, 16],
  ['connections-manual-front.png', manualFront, 16],
  ['connections-console-rear.png', consoleRear, 20],
  ['connections-console-front.png', consoleFront, 16],
  ['connections-talks-rear.png', talksRear, 16],
  ['connections-talks-front.png', talksFront, 16],
  ['receiver-manual.png', manualReceiver, 8],
  ['receiver-console.png', consoleReceiver, 12],
  ['receiver-talks.png', talksReceiver, 12],
  ['utility-mid.png', utilityMid, 16],
  ['front-occluders.png', frontOccluders, 16],
  ['stairs-rear.png', stairsRear, 12],
  ['stairs-front.png', stairsFront, 12],
]) {
  outputs.push(await writeLogicalPlate(file, maker(), colors))
}

for (const stall of stalls) {
  outputs.push(await writeFootprint(stall, 'caster'))
  outputs.push(await writeFootprint(stall, 'contact'))
}

const analysis = await Promise.all(outputs.map(analyze))
const report = {
  floor: 'workshop-desktop',
  status: 'prototype',
  logicalStage: LOGICAL,
  deliveredStage: DELIVERED,
  authoredPixelScale: SCALE,
  outputs: analysis,
}

const reportPath = path.join(REPORT_DIR, 'integration-assets.json')
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(`Built ${outputs.length} workshop integration assets.`)
console.log(path.relative(ROOT, reportPath))
