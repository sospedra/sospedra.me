import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const TEST_ROOT = path.join(ROOT, 'public/images/bazaar3/hybrid-floor-test')
const RAW_DIR = path.join(TEST_ROOT, 'raw')
const OUT_DIR = path.join(TEST_ROOT, 'processed')
const PROP_DIR = path.join(TEST_ROOT, 'props')
const ARCHITECTURE_DIR = path.join(
  ROOT,
  'public/images/bazaar3/assets/architecture',
)

const STAGE = { width: 1536, height: 1024, authoredHeight: 1023 }
const GRID = 3
const GROUND_Y = 801

const CORRIDORS = [
  { id: 'stairs-projects', left: 288, width: 48, cut: 312 },
  { id: 'projects-games', left: 702, width: 48, cut: 726 },
  { id: 'games-travel', left: 1056, width: 48, cut: 1080 },
]

const PALETTE = {
  N: [
    '#020307',
    '#080c12',
    '#111923',
    '#1c2731',
    '#2b3741',
    '#414c55',
    '#606970',
    '#898e8d',
  ],
  C: ['#4b4236', '#786852', '#a38b69', '#cfad7e', '#edd09c'],
  W: ['#1d100a', '#321a0f', '#4b2816', '#6b391c', '#925022', '#bd7133'],
  R: ['#361015', '#5c171c', '#882225', '#b83932', '#dd6048'],
  P: ['#171221', '#2a1e38', '#443153', '#674870', '#966d94'],
  B: ['#071421', '#0a2942', '#0d486d', '#126e9b', '#1f9cc8', '#4bd2e1'],
  T: ['#071c1d', '#0e3534', '#165652', '#267c73', '#56b4a4'],
  G: ['#10180e', '#1e2d14', '#31461a', '#4b6220', '#6b7e2d', '#95a247'],
  K: ['#2e1723', '#50283b', '#784159', '#a95f77', '#d68b9a'],
  A: ['#4a280d', '#7b4514', '#ad6a1e', '#df9e32', '#ffd26b'],
  S: ['#2f1915', '#542b22', '#80442f', '#ad6744', '#d18d5a', '#efbd82'],
  E: ['#ffe3a1', '#8be9e7'],
}

const allowed = (...ramps) =>
  ramps.flatMap((ramp) => PALETTE[ramp]).map(hexToRgb)

const LAYER_PALETTES = {
  shell: allowed('N', 'W'),
  stairs: allowed('N', 'W', 'P', 'A', 'E'),
  projects: allowed('N', 'C', 'W', 'P', 'G', 'K', 'A', 'E'),
  games: allowed('N', 'C', 'W', 'R', 'B', 'S', 'A', 'E'),
  travel: allowed('N', 'C', 'W', 'P', 'B', 'A', 'E'),
  sharedProp: allowed('N', 'W', 'P', 'A', 'E'),
  projectsProp: allowed('N', 'C', 'W', 'P', 'G', 'K', 'A', 'E'),
  gamesProp: allowed('N', 'C', 'W', 'R', 'B', 'A', 'E'),
  travelProp: allowed('N', 'C', 'W', 'P', 'B', 'A', 'E'),
}

const SPRITES = [
  {
    id: 'stairs',
    input: 'stairs-chroma.png',
    output: 'stairs.png',
    key: 'green',
    palette: LAYER_PALETTES.stairs,
    targetWidth: 282,
    x: 3,
  },
  {
    id: 'projects',
    input: 'projects-chroma.png',
    output: 'projects.png',
    key: 'magenta',
    palette: LAYER_PALETTES.projects,
    targetWidth: 354,
    x: 342,
    removeRects: [{ left: 360, top: 1210, width: 205, height: 229 }],
  },
  {
    id: 'games',
    input: 'games-chroma.png',
    output: 'games.png',
    key: 'magenta',
    palette: LAYER_PALETTES.games,
    targetWidth: 294,
    x: 756,
  },
  {
    id: 'travel',
    input: 'travel-chroma.png',
    output: 'travel.png',
    key: 'magenta',
    palette: LAYER_PALETTES.travel,
    targetWidth: 408,
    x: 1116,
  },
]

const PROP_CELLS = [
  {
    id: 'beam',
    col: 0,
    row: 0,
    targetWidth: 36,
    palette: LAYER_PALETTES.sharedProp,
  },
  {
    id: 'junction',
    col: 1,
    row: 0,
    targetWidth: 48,
    palette: LAYER_PALETTES.sharedProp,
  },
  {
    id: 'drain-grate',
    col: 2,
    row: 0,
    targetWidth: 150,
    palette: LAYER_PALETTES.sharedProp,
  },
  {
    id: 'pipe-end',
    col: 3,
    row: 0,
    targetWidth: 180,
    palette: LAYER_PALETTES.sharedProp,
  },
  {
    id: 'water-valve',
    col: 0,
    row: 1,
    targetWidth: 66,
    palette: LAYER_PALETTES.projectsProp,
  },
  {
    id: 'drain-trap',
    col: 1,
    row: 1,
    targetWidth: 63,
    palette: LAYER_PALETTES.projectsProp,
  },
  {
    id: 'vine-clamp',
    col: 2,
    row: 1,
    targetWidth: 60,
    palette: LAYER_PALETTES.projectsProp,
  },
  {
    id: 'bucket-pots',
    col: 3,
    row: 1,
    targetWidth: 81,
    palette: LAYER_PALETTES.projectsProp,
  },
  {
    id: 'cartridge-crate',
    col: 0,
    row: 2,
    targetWidth: 96,
    palette: LAYER_PALETTES.gamesProp,
  },
  {
    id: 'cable-reel',
    col: 1,
    row: 2,
    targetWidth: 96,
    palette: LAYER_PALETTES.gamesProp,
  },
  {
    id: 'suitcase',
    col: 2,
    row: 2,
    targetWidth: 87,
    palette: LAYER_PALETTES.travelProp,
  },
  {
    id: 'route-marker',
    col: 3,
    row: 2,
    targetWidth: 48,
    palette: LAYER_PALETTES.travelProp,
  },
]

await fs.mkdir(OUT_DIR, { recursive: true })
await fs.mkdir(PROP_DIR, { recursive: true })

const shellReport = await buildShell()
const spriteReports = []

for (const sprite of SPRITES) {
  const result = await removeChroma(
    path.join(RAW_DIR, sprite.input),
    sprite.key,
    sprite.removeRects ?? [],
  )
  const normalized = await normalizeCutout({
    ...result,
    output: path.join(OUT_DIR, sprite.output),
    palette: sprite.palette,
    targetWidth: sprite.targetWidth,
  })
  spriteReports.push({ ...sprite, ...normalized })
}

const atlas = await removeChroma(
  path.join(RAW_DIR, 'props-atlas-chroma.png'),
  'magenta',
)
await writeRawPng(
  path.join(OUT_DIR, 'props-atlas-keyed.png'),
  atlas.data,
  atlas.width,
  atlas.height,
)

const propReports = []
for (const cell of PROP_CELLS) {
  const cellRect = atlasCell(cell.col, cell.row, atlas.width, atlas.height)
  const extracted = extractRaw(atlas, cellRect)
  const normalized = await normalizeCutout({
    ...extracted,
    output: path.join(PROP_DIR, `${cell.id}.png`),
    palette: cell.palette,
    targetWidth: cell.targetWidth,
  })
  propReports.push({ ...cell, ...normalized })
}

const architecture = await buildArchitecturePieces()
const receivers = await buildWorldPlates()
const reconstruction = await buildReconstruction()
const validation = await validateBuild(reconstruction.occupancy)

await fs.writeFile(
  path.join(TEST_ROOT, 'build-report.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      stage: STAGE,
      grid: GRID,
      corridors: CORRIDORS,
      shell: shellReport,
      sprites: spriteReports,
      props: propReports,
      architecture,
      receivers,
      reconstruction: reconstruction.report,
      validation,
    },
    null,
    2,
  )}\n`,
)

console.log(
  JSON.stringify(
    {
      output: path.join(OUT_DIR, 'reconstruction.png'),
      validation,
    },
    null,
    2,
  ),
)

async function buildShell() {
  const input = path.join(RAW_DIR, 'empty-shell.png')
  const logical = await sharp(input)
    .resize({
      width: STAGE.width / GRID,
      height: STAGE.authoredHeight / GRID,
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  remapOpaque(logical.data, LAYER_PALETTES.shell)

  const normalized = await sharp(logical.data, { raw: logical.info })
    .resize({
      width: STAGE.width,
      height: STAGE.authoredHeight,
      kernel: 'nearest',
    })
    .extend({ bottom: 1, extendWith: 'copy' })
    .png({ palette: false })
    .toBuffer()

  await fs.writeFile(path.join(OUT_DIR, 'shell-normalized.png'), normalized)

  const seed = await sharp(normalized)
    .extract({ left: 384, top: 0, width: 384, height: STAGE.height })
    .png()
    .toBuffer()
  const mirrored = await sharp(seed).flop().png().toBuffer()
  const tile = await sharp({
    create: {
      width: 768,
      height: STAGE.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: seed, left: 0, top: 0 },
      { input: mirrored, left: 384, top: 0 },
    ])
    .png({ palette: false })
    .toBuffer()

  const tilePath = path.join(OUT_DIR, 'shell-tile.png')
  await fs.writeFile(tilePath, tile)

  const seam = await compareTileEdges(tilePath)
  return {
    source: input,
    normalized: path.join(OUT_DIR, 'shell-normalized.png'),
    tile: tilePath,
    tileSize: { width: 768, height: STAGE.height },
    palette: uniqueOpaqueColors(logical.data),
    seam,
  }
}

async function buildWorldPlates() {
  const width = STAGE.width / GRID
  const height = STAGE.authoredHeight / GRID
  const receiver = Buffer.alloc(width * height * 4)
  const contact = Buffer.alloc(width * height * 4)
  const shellTile = await fs.readFile(path.join(OUT_DIR, 'shell-tile.png'))
  const shellFull = await sharp({
    create: {
      width: STAGE.width,
      height: STAGE.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: shellTile, tile: true, left: 0, top: 0 }])
    .png({ palette: false })
    .toBuffer()
  const shellLogical = await sharp(shellFull)
    .extract({
      left: 0,
      top: 0,
      width: STAGE.width,
      height: STAGE.authoredHeight,
    })
    .resize({ width, height, kernel: 'nearest' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const fills = {
    deep: hexToRgb('#080c12'),
  }

  // Receivers are deliberately much quieter than their emitters. The shell
  // remains the dominant material; hue only appears near a real source and in
  // its corresponding floor bounce.
  const purpleWeak = [
    PALETTE.N[1],
    PALETTE.N[2],
    PALETTE.N[3],
    PALETTE.P[1],
  ].map(hexToRgb)
  const purpleDirect = [
    PALETTE.N[2],
    PALETTE.N[3],
    PALETTE.P[1],
    PALETTE.P[2],
  ].map(hexToRgb)
  const amberWeak = [
    PALETTE.N[1],
    PALETTE.N[2],
    PALETTE.N[3],
    PALETTE.W[1],
  ].map(hexToRgb)
  const amberDirect = [
    PALETTE.N[2],
    PALETTE.N[3],
    PALETTE.W[1],
    PALETTE.A[0],
  ].map(hexToRgb)
  const cyanWeak = [PALETTE.N[1], PALETTE.N[2], PALETTE.N[3], PALETTE.B[1]].map(
    hexToRgb,
  )
  const cyanDirect = [
    PALETTE.N[2],
    PALETTE.N[3],
    PALETTE.B[1],
    PALETTE.B[2],
  ].map(hexToRgb)

  // Stair utility lamp: a compact stepped wall halo, mostly occluded by the
  // stair itself, plus a narrow purple landing reflection.
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [8, 58, 56, 3],
      [6, 61, 60, 5],
      [9, 66, 54, 5],
      [15, 71, 42, 4],
      [22, 75, 28, 3],
      [8, 267, 78, 3],
      [13, 270, 68, 4],
      [20, 274, 54, 4],
      [29, 278, 36, 3],
    ],
    purpleWeak,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [19, 62, 34, 4],
      [23, 66, 27, 4],
      [30, 70, 17, 3],
      [25, 268, 43, 3],
      [33, 271, 28, 3],
    ],
    purpleDirect,
  )

  // Projects: a broken amber rim follows the bulb string; the violet seed lamp
  // has its own smaller response. Both continue down into the stall threshold.
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [125, 120, 83, 3],
      [120, 123, 94, 4],
      [124, 127, 87, 4],
      [132, 131, 71, 3],
      [141, 134, 53, 3],
      [116, 267, 112, 3],
      [121, 270, 102, 4],
      [129, 274, 86, 4],
      [140, 278, 64, 4],
      [151, 282, 42, 3],
    ],
    amberWeak,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [141, 124, 52, 3],
      [148, 127, 39, 3],
      [157, 130, 22, 3],
      [145, 268, 52, 3],
      [154, 271, 34, 3],
    ],
    amberDirect,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [175, 143, 28, 4],
      [179, 147, 21, 4],
      [183, 151, 14, 3],
      [177, 272, 30, 3],
      [182, 275, 20, 3],
    ],
    purpleDirect,
  )

  // Games: warm bulbs stay local to the hanging sign; the arcade cabinet and
  // handheld create a separate cyan threshold/floor reflection.
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [265, 139, 67, 3],
      [260, 142, 77, 4],
      [265, 146, 67, 4],
      [273, 150, 51, 3],
    ],
    amberWeak,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [278, 143, 39, 3],
      [285, 146, 26, 3],
    ],
    amberDirect,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [255, 190, 80, 4],
      [260, 194, 70, 5],
      [268, 199, 54, 4],
      [252, 267, 94, 3],
      [257, 270, 84, 4],
      [265, 274, 68, 4],
      [275, 278, 48, 4],
      [286, 282, 26, 3],
    ],
    cyanWeak,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [270, 193, 45, 4],
      [279, 197, 27, 3],
      [274, 268, 50, 3],
      [284, 271, 31, 3],
    ],
    cyanDirect,
  )

  // Travel: the two lanterns make two distinct receiver chains, never one
  // generic global wash. Their floor bounces remain inside Travel's crop.
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [376, 135, 22, 4],
      [373, 139, 28, 6],
      [376, 145, 22, 5],
      [383, 150, 11, 4],
      [479, 135, 22, 4],
      [476, 139, 28, 6],
      [479, 145, 22, 5],
      [486, 150, 11, 4],
      [374, 267, 46, 3],
      [370, 270, 54, 4],
      [374, 274, 47, 4],
      [382, 278, 31, 4],
      [462, 267, 44, 3],
      [457, 270, 51, 4],
      [460, 274, 46, 4],
      [468, 278, 30, 4],
    ],
    amberWeak,
  )
  paintTintedRects(
    receiver,
    shellLogical.data,
    width,
    [
      [382, 140, 12, 5],
      [385, 145, 8, 4],
      [485, 140, 12, 5],
      [488, 145, 8, 4],
      [387, 269, 21, 3],
      [474, 269, 20, 3],
    ],
    amberDirect,
  )

  // Compact, support-specific contacts: never a shared ellipse.
  paintRects(
    contact,
    width,
    [
      [25, 263, 21, 3],
      [53, 263, 18, 3],
      [78, 263, 13, 3],
      [117, 263, 24, 3],
      [151, 263, 18, 3],
      [188, 263, 26, 3],
      [258, 263, 24, 3],
      [291, 263, 18, 3],
      [322, 263, 22, 3],
      [375, 263, 28, 3],
      [425, 263, 24, 3],
      [477, 263, 27, 3],
    ],
    fills.deep,
  )

  const receiverPath = path.join(OUT_DIR, 'world-receivers.png')
  const contactPath = path.join(OUT_DIR, 'contacts.png')
  await upscaleLogical(receiver, width, height, receiverPath)
  await upscaleLogical(contact, width, height, contactPath)

  return {
    receiver: receiverPath,
    contact: contactPath,
    alpha: {
      receiver: uniqueAlpha(receiver),
      contact: uniqueAlpha(contact),
    },
  }
}

async function buildArchitecturePieces() {
  const verticalSource = path.join(ARCHITECTURE_DIR, 'h-beam-vertical.png')
  const jointSource = path.join(ARCHITECTURE_DIR, 'h-beam-joint.png')
  const vertical = await fs.readFile(verticalSource)
  const columnPath = path.join(OUT_DIR, 'beam-column.png')
  const jointPath = path.join(OUT_DIR, 'beam-joint.png')

  await sharp({
    create: {
      width: 54,
      height: 708,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: vertical, left: 0, top: 0 },
      { input: vertical, left: 0, top: 288 },
      { input: vertical, left: 0, top: 576 },
    ])
    .png({ palette: false })
    .toFile(columnPath)

  await sharp(jointSource).png({ palette: false }).toFile(jointPath)

  return {
    column: columnPath,
    joint: jointPath,
    dimensions: {
      column: { width: 54, height: 708 },
      joint: { width: 72, height: 72 },
    },
  }
}

async function buildReconstruction() {
  const shellTile = await fs.readFile(path.join(OUT_DIR, 'shell-tile.png'))
  const receiverPath = path.join(OUT_DIR, 'world-receivers.png')
  const contactPath = path.join(OUT_DIR, 'contacts.png')
  const rearPlacements = [
    { id: 'pipe-end', x: 42, y: 69 },
    { id: 'pipe-end', x: 390, y: 69 },
    { id: 'pipe-end', x: 789, y: 69 },
    { id: 'pipe-end', x: 1200, y: 69 },
    { id: 'water-valve', x: 348, y: 405 },
    { id: 'vine-clamp', x: 633, y: 207 },
    { id: 'route-marker', x: 1116, y: 594 },
  ]

  const frontPlacements = [
    { id: 'drain-grate', x: 30, y: 735 },
    { id: 'drain-grate', x: 366, y: 735 },
    { id: 'drain-grate', x: 777, y: 735 },
    { id: 'drain-grate', x: 1152, y: 735 },
    { id: 'drain-trap', x: 624, y: 690 },
    { id: 'bucket-pots', x: 606, y: 714 },
    { id: 'cartridge-crate', x: 756, y: 702 },
    { id: 'cable-reel', x: 945, y: 696 },
    { id: 'suitcase', x: 1419, y: 702 },
  ]

  const spritePlacements = []
  for (const sprite of SPRITES) {
    const file = path.join(OUT_DIR, sprite.output)
    const meta = await sharp(file).metadata()
    spritePlacements.push({
      id: sprite.id,
      file,
      x: sprite.x,
      y: GROUND_Y - meta.height,
      width: meta.width,
      height: meta.height,
    })
  }

  const allRear = await placementComposites(rearPlacements)
  const allFront = await placementComposites(frontPlacements)
  const architectureComposites = [
    { input: path.join(OUT_DIR, 'beam-column.png'), left: 234, top: 72 },
    { input: path.join(OUT_DIR, 'beam-column.png'), left: 648, top: 72 },
    { input: path.join(OUT_DIR, 'beam-column.png'), left: 1002, top: 72 },
    { input: path.join(OUT_DIR, 'beam-joint.png'), left: 216, top: 36 },
    { input: path.join(OUT_DIR, 'beam-joint.png'), left: 630, top: 36 },
    { input: path.join(OUT_DIR, 'beam-joint.png'), left: 984, top: 36 },
  ]

  const composite = [
    { input: shellTile, left: 0, top: 0 },
    { input: shellTile, left: 768, top: 0 },
    { input: receiverPath, left: 0, top: 0 },
    ...architectureComposites,
    ...allRear.composites,
    { input: contactPath, left: 0, top: 0 },
    ...spritePlacements.map((placement) => ({
      input: placement.file,
      left: placement.x,
      top: placement.y,
    })),
    ...allFront.composites,
  ]

  const output = path.join(OUT_DIR, 'reconstruction.png')
  await sharp({
    create: {
      width: STAGE.width,
      height: STAGE.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite(composite)
    .png({ palette: false })
    .toFile(output)

  const occupancy = await buildOccupancy([
    { input: receiverPath, left: 0, top: 0 },
    ...architectureComposites,
    ...allRear.composites,
    { input: contactPath, left: 0, top: 0 },
    ...spritePlacements.map((placement) => ({
      input: placement.file,
      left: placement.x,
      top: placement.y,
    })),
    ...allFront.composites,
  ])

  await writeRawPng(
    path.join(OUT_DIR, 'non-shell-occupancy.png'),
    occupancy,
    STAGE.width,
    STAGE.height,
  )

  return {
    occupancy,
    report: {
      output,
      architecture: architectureComposites.map(({ left, top }, index) => ({
        id: index < 3 ? 'beam-column' : 'beam-joint',
        left,
        top,
      })),
      rearPlacements: allRear.placements,
      sprites: spritePlacements,
      frontPlacements: allFront.placements,
    },
  }
}

async function placementComposites(placements) {
  const composites = []
  const resolved = []
  for (const placement of placements) {
    const file = path.join(PROP_DIR, `${placement.id}.png`)
    const meta = await sharp(file).metadata()
    composites.push({ input: file, left: placement.x, top: placement.y })
    resolved.push({ ...placement, width: meta.width, height: meta.height })
  }
  return { composites, placements: resolved }
}

async function buildOccupancy(composites) {
  const result = await sharp({
    create: {
      width: STAGE.width,
      height: STAGE.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const mask = Buffer.alloc(result.data.length)
  for (let index = 0; index < result.data.length; index += 4) {
    const occupied = result.data[index + 3] > 0
    mask[index] = occupied ? 255 : 0
    mask[index + 1] = occupied ? 255 : 0
    mask[index + 2] = occupied ? 255 : 0
    mask[index + 3] = occupied ? 255 : 0
  }
  return mask
}

async function validateBuild(occupancy) {
  const corridorResults = CORRIDORS.map((corridor) => {
    let occupiedPixels = 0
    for (let y = 0; y < STAGE.height; y += 1) {
      for (let x = corridor.left; x < corridor.left + corridor.width; x += 1) {
        if (occupancy[(y * STAGE.width + x) * 4 + 3] !== 0) {
          occupiedPixels += 1
        }
      }
    }
    return {
      ...corridor,
      gridAligned:
        corridor.left % GRID === 0 &&
        corridor.width % GRID === 0 &&
        corridor.cut % GRID === 0,
      occupiedPixels,
      passed: occupiedPixels === 0,
    }
  })

  const assets = []
  for (const sprite of SPRITES) {
    assets.push(
      await inspectAsset(path.join(OUT_DIR, sprite.output), sprite.id),
    )
  }
  for (const prop of PROP_CELLS) {
    assets.push(
      await inspectAsset(path.join(PROP_DIR, `${prop.id}.png`), prop.id),
    )
  }
  assets.push(
    await inspectAsset(path.join(OUT_DIR, 'world-receivers.png'), 'receivers'),
  )
  assets.push(
    await inspectAsset(path.join(OUT_DIR, 'contacts.png'), 'contacts'),
  )
  assets.push(
    await inspectAsset(path.join(OUT_DIR, 'beam-column.png'), 'beam-column'),
  )
  assets.push(
    await inspectAsset(path.join(OUT_DIR, 'beam-joint.png'), 'beam-joint'),
  )

  const tileSeam = await compareTileEdges(path.join(OUT_DIR, 'shell-tile.png'))
  const passed =
    corridorResults.every((result) => result.passed && result.gridAligned) &&
    assets.every(
      (asset) =>
        asset.binaryAlpha &&
        asset.grid.widthRemainder === 0 &&
        (asset.grid.heightRemainder === 0 ||
          (asset.grid.heightRemainder === 1 &&
            asset.grid.paddingRowTransparent)),
    ) &&
    tileSeam.differentBytes === 0

  return { passed, corridors: corridorResults, assets, tileSeam }
}

async function inspectAsset(file, id) {
  const image = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const alpha = uniqueAlpha(image.data)
  let paddingRowTransparent = true
  const lastRowStart =
    (image.info.height - 1) * image.info.width * image.info.channels
  for (
    let offset = lastRowStart + 3;
    offset < image.data.length;
    offset += image.info.channels
  ) {
    if (image.data[offset] !== 0) {
      paddingRowTransparent = false
      break
    }
  }
  return {
    id,
    file,
    dimensions: {
      width: image.info.width,
      height: image.info.height,
    },
    grid: {
      widthRemainder: image.info.width % GRID,
      heightRemainder: image.info.height % GRID,
      paddingRowTransparent,
    },
    alpha,
    binaryAlpha: alpha.every((value) => value === 0 || value === 255),
    opaqueColors: uniqueOpaqueColors(image.data),
  }
}

async function compareTileEdges(file) {
  const raw = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let differentBytes = 0
  for (let y = 0; y < raw.info.height; y += 1) {
    const left = y * raw.info.width * 4
    const right = (y * raw.info.width + raw.info.width - 1) * 4
    for (let channel = 0; channel < 4; channel += 1) {
      if (raw.data[left + channel] !== raw.data[right + channel]) {
        differentBytes += 1
      }
    }
  }
  return { differentBytes, passed: differentBytes === 0 }
}

async function removeChroma(file, kind, removeRects = []) {
  const raw = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const data = Buffer.from(raw.data)
  const { width, height } = raw.info

  const high = Buffer.alloc(width * height)
  const medium = Buffer.alloc(width * height)

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const tests =
      kind === 'green'
        ? greenKeyTests(red, green, blue)
        : magentaKeyTests(red, green, blue)
    high[pixel] = tests.high ? 1 : 0
    medium[pixel] = tests.medium ? 1 : 0
  }

  const connected = borderFlood(medium, width, height)
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4
    const transparent = high[pixel] === 1 || connected[pixel] === 1
    if (transparent) {
      data[offset] = 0
      data[offset + 1] = 0
      data[offset + 2] = 0
      data[offset + 3] = 0
    } else {
      data[offset + 3] = 255
    }
  }

  for (const rect of removeRects) {
    clearRect(data, width, height, rect)
  }

  return { data, width, height }
}

function magentaKeyTests(red, green, blue) {
  return {
    high:
      red > 175 &&
      blue > 175 &&
      green < 145 &&
      Math.min(red, blue) - green > 55 &&
      Math.abs(red - blue) < 115,
    medium:
      red > 70 &&
      blue > 70 &&
      green < 170 &&
      Math.min(red, blue) - green > 35 &&
      Math.abs(red - blue) < 135,
  }
}

function greenKeyTests(red, green, blue) {
  return {
    high:
      green > 175 &&
      red < 145 &&
      blue < 145 &&
      green - Math.max(red, blue) > 55,
    medium:
      green > 70 && red < 170 && blue < 170 && green - Math.max(red, blue) > 35,
  }
}

function borderFlood(candidate, width, height) {
  const visited = Buffer.alloc(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0

  const enqueue = (x, y) => {
    const index = y * width + x
    if (visited[index] || !candidate[index]) return
    visited[index] = 1
    queue[tail] = index
    tail += 1
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0)
    enqueue(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y)
    enqueue(width - 1, y)
  }

  while (head < tail) {
    const index = queue[head]
    head += 1
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(x - 1, y)
    if (x + 1 < width) enqueue(x + 1, y)
    if (y > 0) enqueue(x, y - 1)
    if (y + 1 < height) enqueue(x, y + 1)
  }

  return visited
}

async function normalizeCutout({
  data,
  width,
  height,
  output,
  palette,
  targetWidth,
}) {
  const bounds = alphaBounds(data, width, height)
  if (!bounds) throw new Error(`${output}: no opaque pixels after key removal`)

  const cropped = extractRaw(
    { data, width, height },
    {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    },
  )

  const targetLogicalWidth = targetWidth / GRID
  const padding = 2
  const contentWidth = targetLogicalWidth - padding * 2
  const contentHeight = Math.max(
    1,
    Math.round((cropped.height * contentWidth) / cropped.width),
  )
  const resized = await sharp(cropped.data, {
    raw: {
      width: cropped.width,
      height: cropped.height,
      channels: 4,
    },
  })
    .resize({
      width: contentWidth,
      height: contentHeight,
      fit: 'fill',
      kernel: 'nearest',
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let index = 3; index < resized.data.length; index += 4) {
    resized.data[index] = resized.data[index] >= 128 ? 255 : 0
  }
  remapOpaque(resized.data, palette)

  const logicalWidth = targetLogicalWidth
  const logicalHeight = contentHeight + padding * 2
  const logical = Buffer.alloc(logicalWidth * logicalHeight * 4)
  blit(
    logical,
    logicalWidth,
    logicalHeight,
    resized.data,
    contentWidth,
    contentHeight,
    padding,
    padding,
  )

  await sharp(logical, {
    raw: {
      width: logicalWidth,
      height: logicalHeight,
      channels: 4,
    },
  })
    .resize({
      width: logicalWidth * GRID,
      height: logicalHeight * GRID,
      kernel: 'nearest',
    })
    .png({ palette: false })
    .toFile(output)

  return {
    output,
    sourceBounds: bounds,
    dimensions: {
      width: logicalWidth * GRID,
      height: logicalHeight * GRID,
    },
    logical: { width: logicalWidth, height: logicalHeight },
    alpha: uniqueAlpha(logical),
    opaqueColors: uniqueOpaqueColors(logical),
  }
}

function atlasCell(col, row, width, height) {
  const cellWidth = Math.floor(width / 4)
  const rowStarts = [0, 341, 682]
  const rowEnds = [341, 682, height]
  return {
    left: col * cellWidth,
    top: rowStarts[row],
    width: col === 3 ? width - col * cellWidth : cellWidth,
    height: rowEnds[row] - rowStarts[row],
  }
}

function extractRaw(source, rect) {
  const data = Buffer.alloc(rect.width * rect.height * 4)
  for (let y = 0; y < rect.height; y += 1) {
    const sourceStart = ((rect.top + y) * source.width + rect.left) * 4
    const targetStart = y * rect.width * 4
    source.data.copy(
      data,
      targetStart,
      sourceStart,
      sourceStart + rect.width * 4,
    )
  }
  return { data, width: rect.width, height: rect.height }
}

function alphaBounds(data, width, height) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) return null
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

function remapOpaque(data, palette) {
  const cache = new Map()
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) {
      data[offset] = 0
      data[offset + 1] = 0
      data[offset + 2] = 0
      continue
    }
    data[offset + 3] = 255
    const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`
    let mapped = cache.get(key)
    if (!mapped) {
      mapped = nearestColor(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        palette,
      )
      cache.set(key, mapped)
    }
    data[offset] = mapped.r
    data[offset + 1] = mapped.g
    data[offset + 2] = mapped.b
  }
}

function nearestColor(red, green, blue, palette) {
  let best = palette[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of palette) {
    const redDelta = red - candidate.r
    const greenDelta = green - candidate.g
    const blueDelta = blue - candidate.b
    const distance =
      redDelta * redDelta * 0.3 +
      greenDelta * greenDelta * 0.59 +
      blueDelta * blueDelta * 0.11
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function paintRects(buffer, width, rects, color) {
  for (const [left, top, rectWidth, rectHeight] of rects) {
    for (let y = top; y < top + rectHeight; y += 1) {
      for (let x = left; x < left + rectWidth; x += 1) {
        const offset = (y * width + x) * 4
        buffer[offset] = color.r
        buffer[offset + 1] = color.g
        buffer[offset + 2] = color.b
        buffer[offset + 3] = 255
      }
    }
  }
}

function paintTintedRects(buffer, source, width, rects, ramp) {
  for (const [left, top, rectWidth, rectHeight] of rects) {
    for (let y = top; y < top + rectHeight; y += 1) {
      for (let x = left; x < left + rectWidth; x += 1) {
        const offset = (y * width + x) * 4
        if (source[offset + 3] === 0) continue
        const luma =
          source[offset] * 0.2126 +
          source[offset + 1] * 0.7152 +
          source[offset + 2] * 0.0722
        const rampIndex =
          luma < 22 ? 0 : luma < 42 ? 1 : luma < 68 ? 2 : ramp.length - 1
        const color = ramp[Math.min(rampIndex, ramp.length - 1)]
        buffer[offset] = color.r
        buffer[offset + 1] = color.g
        buffer[offset + 2] = color.b
        buffer[offset + 3] = 255
      }
    }
  }
}

async function upscaleLogical(data, width, height, output) {
  await sharp(data, { raw: { width, height, channels: 4 } })
    .resize({
      width: width * GRID,
      height: height * GRID,
      kernel: 'nearest',
    })
    .extend({ bottom: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: false })
    .toFile(output)
}

function blit(
  target,
  targetWidth,
  targetHeight,
  source,
  sourceWidth,
  sourceHeight,
  left,
  top,
) {
  for (let y = 0; y < sourceHeight; y += 1) {
    if (top + y >= targetHeight) break
    const sourceStart = y * sourceWidth * 4
    const targetStart = ((top + y) * targetWidth + left) * 4
    source.copy(target, targetStart, sourceStart, sourceStart + sourceWidth * 4)
  }
}

function clearRect(data, width, height, rect) {
  const right = Math.min(width, rect.left + rect.width)
  const bottom = Math.min(height, rect.top + rect.height)
  for (let y = Math.max(0, rect.top); y < bottom; y += 1) {
    for (let x = Math.max(0, rect.left); x < right; x += 1) {
      const offset = (y * width + x) * 4
      data[offset] = 0
      data[offset + 1] = 0
      data[offset + 2] = 0
      data[offset + 3] = 0
    }
  }
}

function uniqueAlpha(data) {
  const values = new Set()
  for (let offset = 3; offset < data.length; offset += 4) {
    values.add(data[offset])
  }
  return [...values].sort((a, b) => a - b)
}

function uniqueOpaqueColors(data) {
  const values = new Set()
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue
    values.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`)
  }
  return values.size
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

async function writeRawPng(file, data, width, height) {
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ palette: false })
    .toFile(file)
}
