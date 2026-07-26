import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const GENERATED =
  '/Users/sospedra/.codex/generated_images/019f8c0a-ede3-7032-837a-e3f31949908a'
const OUT = path.join(ROOT, 'public/images/bazaar')
const ASSETS = path.join(OUT, 'assets')
const SHEETS = path.join(OUT, 'sheets')
const SOURCES = path.join(OUT, 'sources')
const SCALE = 8

const sourceFiles = {
  'p1-bg-full': 'exec-4e300d37-ea2f-4510-8191-af6f377e04f1.png',
  'p1-bg-band': 'exec-93849f67-0cd6-4325-be5c-1a43000a3e85.png',
  'p1-street': 'exec-bbc36058-9813-4c0f-a2b1-48f7b7d6deee.png',
  'p1-buildings': 'exec-0ff8476d-81e7-46a2-adb3-e2bf9535b84c.png',
  'p1-interactives': 'exec-fb182143-d31f-4301-a898-2c68a7cb148a.png',
  'slab-pipes': 'exec-3a5c8f02-1446-4902-a16f-361cdddf1d7b.png',
  'mkt-wall': 'exec-1b2046f6-77dc-451e-b553-6c6c62d9b450.png',
  'mkt-depth': 'exec-623aab0b-b0dc-490c-a4bb-8c9a80ca4a9a.png',
  'mkt-floor': 'exec-d927c417-518e-48ac-96c4-71fce2e07dc2.png',
  stairs: 'exec-102c70a4-b514-4d20-9638-8388cad857f8.png',
  'stairs-h': 'exec-59703a5d-2933-4061-b1e9-a308886802cb.png',
  'stairs-i': 'exec-97e3072e-a81a-4a58-bda4-b974507dfaab.png',
  'stairs-c': 'exec-707a718f-7765-4846-bb74-dffa3899ed53.png',
  'stairs-o': 'exec-b991d354-931e-4bd9-95fa-6a1997707f95.png',
  'stall-uses': 'exec-7535a973-18b1-46bd-903a-1fadb3b6838b.png',
  'stall-games': 'exec-81a08cd2-bf50-41af-a741-45f3744d90ca.png',
  'stall-travel': 'exec-50c5fbd3-ac7f-424d-a055-b06ab95815f9.png',
  'stall-manual': 'exec-be207ad5-5e42-4419-9a79-30e056c5cc23.png',
  'stall-manual-steam': 'exec-88e44c78-cf8c-4e90-aaea-bfc43060cf0f.png',
  'stall-serve': 'exec-c490c86a-6383-4c23-86af-f2b7dc53b859.png',
  'stall-projects': 'exec-b65824f4-9181-460d-97b2-21c33134e19b.png',
  'stall-talks': 'exec-5a73e517-57c9-401e-bc84-80fdb8276247.png',
  'stall-papers': 'exec-34d17e7a-5c23-43d7-a7a9-0038f163690f.png',
  livingness: 'exec-efb44b4f-aa1e-4fbc-bc7f-e3087fd5bdbf.png',
  props: 'exec-80a2e124-28b1-4615-bf9f-d11759e233d7.png',
}

const sourcePath = (key) => path.join(GENERATED, sourceFiles[key])
const manifest = []

function record(name, width, height, extra = {}) {
  manifest.push({
    file: name,
    vpx: { width, height },
    output: { width: width * SCALE, height: height * SCALE },
    scale: SCALE,
    ...extra,
  })
}

async function saveVirtual(buffer, name, width, height, extra = {}) {
  const target = path.join(ASSETS, name)
  await sharp(buffer)
    .resize(width * SCALE, height * SCALE, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ compressionLevel: 9 })
    .toFile(target)
  record(name, width, height, extra)
}

async function chromaKey(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const greenDominance = g - Math.max(r, b)
    const keyed = g > 92 && greenDominance > 18 && g > r * 1.12 && g > b * 1.08

    if (keyed) {
      data[i + 3] = 0
    } else if (g > Math.max(r, b) * 1.08) {
      data[i + 1] = Math.round(Math.max(r, b) * 1.08)
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

async function alphaBox(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
  }

  if (right < left || bottom < top) {
    return { left: 0, top: 0, width: info.width, height: info.height }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

function contentRuns(counts, target) {
  const runs = []
  let start = -1
  for (let i = 0; i <= counts.length; i += 1) {
    const active = i < counts.length && counts[i] > 0
    if (active && start < 0) start = i
    if (!active && start >= 0) {
      runs.push({ start, end: i })
      start = -1
    }
  }

  while (runs.length > target) {
    let smallestGap = Number.POSITIVE_INFINITY
    let mergeAt = -1
    for (let i = 0; i < runs.length - 1; i += 1) {
      const gap = runs[i + 1].start - runs[i].end
      if (gap < smallestGap) {
        smallestGap = gap
        mergeAt = i
      }
    }
    runs.splice(mergeAt, 2, {
      start: runs[mergeAt].start,
      end: runs[mergeAt + 1].end,
    })
  }
  return runs.length === target ? runs : null
}

async function detectGridCells(keyed, cols, rows, layoutCounts) {
  const { data, info } = await sharp(keyed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const yCounts = Array.from({ length: info.height }, () => 0)
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 8) yCounts[y] += 1
    }
  }

  const detectedRows = contentRuns(yCounts, rows)
  const rowRuns =
    detectedRows ??
    Array.from({ length: rows }, (_, row) => ({
      start: Math.floor((row * info.height) / rows),
      end: Math.floor(((row + 1) * info.height) / rows),
    }))
  const cells = new Map()

  for (let row = 0; row < rows; row += 1) {
    const rowRun = rowRuns[row]
    const expected = layoutCounts?.[row] ?? cols
    const xCounts = Array.from({ length: info.width }, () => 0)
    for (let y = rowRun.start; y < rowRun.end; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * 4 + 3] > 8) xCounts[x] += 1
      }
    }
    const detectedColumns = contentRuns(xCounts, expected)
    const columnRuns =
      detectedColumns ??
      Array.from({ length: expected }, (_, col) => ({
        start: Math.floor((col * info.width) / expected),
        end: Math.floor(((col + 1) * info.width) / expected),
      }))

    for (let col = 0; col < expected; col += 1) {
      const column = columnRuns[col]
      const padding = 3
      const left = Math.max(0, column.start - padding)
      const top = Math.max(0, rowRun.start - padding)
      const right = Math.min(info.width, column.end + padding)
      const bottom = Math.min(info.height, rowRun.end + padding)
      cells.set(row * cols + col, {
        left,
        top,
        width: right - left,
        height: bottom - top,
      })
    }
  }
  return cells
}

async function mirrorTile(input, width, height, { transparent = false } = {}) {
  const halfWidth = width / 2
  const left = await sharp(input)
    .resize(halfWidth, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer()
  const right = await sharp(left).flop().png().toBuffer()
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 10, g: 5, b: 28, alpha: 1 },
    },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: halfWidth, top: 0 },
    ])
    .png()
    .toBuffer()
}

async function opaqueAsset(name, source, width, height, options = {}) {
  let image = sharp(sourcePath(source))
  if (options.trimWhite) {
    image = image.trim({
      background: { r: 255, g: 255, b: 255 },
      threshold: 18,
    })
  }
  let virtual = await image
    .resize(width, height, {
      fit: 'cover',
      position: options.position ?? 'centre',
      kernel: sharp.kernel.lanczos3,
    })
    .removeAlpha()
    .png()
    .toBuffer()
  if (options.tile) virtual = await mirrorTile(virtual, width, height)
  virtual = await sharp(virtual).removeAlpha().png().toBuffer()
  await saveVirtual(virtual, name, width, height, {
    alpha: false,
    tileableX: Boolean(options.tile),
    anchor: 'canvas',
    sourceSheet: source,
  })
}

async function transparentStandalone(
  name,
  source,
  width,
  height,
  options = {},
) {
  let keyed = await chromaKey(sourcePath(source))
  if (options.trim !== false) {
    const box = await alphaBox(keyed)
    keyed = await sharp(keyed).extract(box).png().toBuffer()
  }

  let virtual
  if (options.tile) {
    virtual = await mirrorTile(keyed, width, height, { transparent: true })
  } else {
    virtual = await sharp(keyed)
      .resize(width, height, {
        fit: options.fit ?? 'contain',
        position: options.position ?? 'southwest',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer()
  }
  await saveVirtual(virtual, name, width, height, {
    alpha: true,
    tileableX: Boolean(options.tile),
    anchor: options.anchor ?? 'bottom-left',
    sourceSheet: source,
  })
}

async function gridAssets(source, cols, rows, entries, layoutCounts) {
  const keyedSheet = await chromaKey(sourcePath(source))
  const meta = await sharp(keyedSheet).metadata()
  const detectedCells = await detectGridCells(
    keyedSheet,
    cols,
    rows,
    layoutCounts,
  )
  const prepared = []

  for (const entry of entries) {
    const fallbackCol = entry.index % cols
    const fallbackRow = Math.floor(entry.index / cols)
    const cellBox = detectedCells.get(entry.index) ?? {
      left: Math.floor((fallbackCol * meta.width) / cols),
      top: Math.floor((fallbackRow * meta.height) / rows),
      width:
        Math.floor(((fallbackCol + 1) * meta.width) / cols) -
        Math.floor((fallbackCol * meta.width) / cols),
      height:
        Math.floor(((fallbackRow + 1) * meta.height) / rows) -
        Math.floor((fallbackRow * meta.height) / rows),
    }
    const cell = await sharp(keyedSheet).extract(cellBox).png().toBuffer()
    const box = await alphaBox(cell)
    prepared.push({ ...entry, keyed: cell, box })
  }

  const groups = new Map()
  for (const item of prepared) {
    const key = item.group ?? item.name
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  for (const items of groups.values()) {
    const groupWidth = Math.max(...items.map((item) => item.box.width))
    const groupHeight = Math.max(...items.map((item) => item.box.height))
    for (const item of items) {
      const subject = await sharp(item.keyed).extract(item.box).png().toBuffer()
      const groupedX =
        item.anchor === 'bottom-center' || item.anchor === 'top-center'
          ? Math.floor((groupWidth - item.box.width) / 2)
          : 0
      const groupedY =
        item.anchor === 'top-center' ? 0 : groupHeight - item.box.height
      const grouped = await sharp({
        create: {
          width: groupWidth,
          height: groupHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: subject, left: groupedX, top: groupedY }])
        .png()
        .toBuffer()

      const padding =
        item.padding ?? (Math.min(item.width, item.height) <= 12 ? 0 : 1)
      const innerWidth = Math.max(1, item.width - padding * 2)
      const innerHeight = Math.max(1, item.height - padding * 2)
      const fitPosition =
        item.anchor === 'top-center'
          ? 'north'
          : item.anchor === 'bottom-center'
            ? 'south'
            : 'southwest'
      const fitted = await sharp(grouped)
        .resize(innerWidth, innerHeight, {
          fit: item.fit ?? 'contain',
          position: fitPosition,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: sharp.kernel.nearest,
        })
        .png()
        .toBuffer()
      const fitMeta = await sharp(fitted).metadata()
      let x = padding
      const y =
        item.anchor === 'top-center'
          ? padding
          : item.height - fitMeta.height - padding
      if (item.anchor === 'bottom-center' || item.anchor === 'top-center') {
        x = Math.floor((item.width - fitMeta.width) / 2)
      }

      let virtual = await sharp({
        create: {
          width: item.width,
          height: item.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: fitted, left: x, top: y }])
        .png()
        .toBuffer()

      if (item.tile) {
        virtual = await mirrorTile(virtual, item.width, item.height, {
          transparent: true,
        })
      }

      await saveVirtual(virtual, item.name, item.width, item.height, {
        alpha: true,
        tileableX: Boolean(item.tile),
        anchor: item.anchor ?? 'bottom-left',
        sourceSheet: source,
        cell: item.index + 1,
      })
    }
  }
}

const entry = (
  name,
  index,
  width,
  height,
  group,
  anchor = 'bottom-left',
  extra = {},
) => ({
  name,
  index,
  width,
  height,
  group,
  anchor,
  ...extra,
})

function stallBase(page, options = {}) {
  const keeperWidth = options.keeperWidth ?? 19
  const idleCount = options.idleCount ?? 2
  const entries = [
    entry(
      `stall-${page}-interior-desktop.png`,
      0,
      80,
      115,
      `${page}-interior-d`,
      'bottom-left',
      { padding: 0 },
    ),
    entry(
      `stall-${page}-interior-mobile.png`,
      1,
      92,
      114,
      `${page}-interior-m`,
      'bottom-left',
      { padding: 0 },
    ),
    entry(
      `stall-${page}-front-desktop.png`,
      2,
      80,
      115,
      `${page}-front-d`,
      'bottom-left',
      { padding: 0 },
    ),
    entry(
      `stall-${page}-front-mobile.png`,
      3,
      92,
      114,
      `${page}-front-m`,
      'bottom-left',
      { padding: 0 },
    ),
    entry(
      `stall-${page}-lit-desktop.png`,
      4,
      80,
      115,
      `${page}-front-d`,
      'bottom-left',
      { padding: 0 },
    ),
    entry(
      `stall-${page}-lit-mobile.png`,
      5,
      92,
      114,
      `${page}-front-m`,
      'bottom-left',
      { padding: 0 },
    ),
  ]
  let cursor = 6
  for (let i = 1; i <= idleCount; i += 1) {
    entries.push(
      entry(
        `stall-${page}-keeper-idle-${i}.png`,
        cursor,
        keeperWidth,
        70,
        `${page}-keeper`,
        'bottom-center',
      ),
    )
    cursor += 1
  }
  for (let i = 1; i <= 3; i += 1) {
    entries.push(
      entry(
        `stall-${page}-keeper-hover-${i}.png`,
        cursor,
        keeperWidth,
        70,
        `${page}-keeper`,
        'bottom-center',
      ),
    )
    cursor += 1
  }
  return { entries, cursor }
}

async function buildStall(page, props, options = {}) {
  const base = stallBase(page, options)
  props.forEach((prop, offset) => {
    base.entries.push(
      entry(
        `stall-${page}-prop-${prop.name}-${prop.frame}.png`,
        base.cursor + offset,
        prop.width,
        prop.height,
        `${page}-prop-${prop.name}`,
        prop.anchor ?? 'bottom-left',
      ),
    )
  })
  await gridAssets(
    `stall-${page}`,
    options.cols ?? 4,
    options.rows ?? 4,
    base.entries,
    options.layoutCounts,
  )
}

async function main() {
  await Promise.all(
    [ASSETS, SHEETS, SOURCES].map((dir) => mkdir(dir, { recursive: true })),
  )

  for (const [key, filename] of Object.entries(sourceFiles)) {
    await copyFile(
      path.join(GENERATED, filename),
      path.join(SOURCES, `${key}.png`),
    )
  }

  await opaqueAsset('p1-bg-full.png', 'p1-bg-full', 288, 180)
  await transparentStandalone('p1-bg-band.png', 'p1-bg-band', 512, 114, {
    tile: true,
  })
  await opaqueAsset('p1-street.png', 'p1-street', 512, 48, {
    tile: true,
    trimWhite: true,
  })

  await gridAssets(
    'p1-buildings',
    3,
    2,
    [
      entry('p1-bldg-a-desktop.png', 0, 80, 123, 'p1-a-d'),
      entry('p1-bldg-a-mobile.png', 1, 42, 186, 'p1-a-m'),
      entry('p1-bldg-c-desktop.png', 2, 54, 140, 'p1-c-d'),
      entry('p1-bldg-d-desktop.png', 3, 106, 140, 'p1-d-d'),
      entry('p1-bldg-d-mobile.png', 4, 66, 212, 'p1-d-m'),
    ],
    [3, 2],
  )

  await gridAssets(
    'p1-interactives',
    4,
    2,
    [
      entry('p1-busstop.png', 0, 70, 80, 'busstop'),
      entry('p1-busstop-lit-1.png', 1, 70, 80, 'busstop'),
      entry('p1-busstop-lit-2.png', 2, 70, 80, 'busstop'),
      entry('p1-door-closed.png', 3, 32, 67, 'door'),
      entry('p1-door-mid.png', 4, 32, 67, 'door'),
      entry('p1-door-ajar.png', 5, 32, 67, 'door'),
      entry('p1-sign-plate.png', 6, 45, 16, 'sign'),
      entry('p1-sign-plate-lit.png', 7, 45, 16, 'sign'),
    ],
    [4, 4],
  )

  await gridAssets(
    'slab-pipes',
    1,
    3,
    [
      entry('slab-pipes-1.png', 0, 512, 24, 'slab-1', 'bottom-left', {
        fit: 'fill',
        padding: 0,
        tile: true,
      }),
      entry('slab-pipes-2.png', 1, 512, 24, 'slab-2', 'bottom-left', {
        fit: 'fill',
        padding: 0,
        tile: true,
      }),
      entry('slab-pipes-3.png', 2, 512, 24, 'slab-3', 'bottom-left', {
        fit: 'fill',
        padding: 0,
        tile: true,
      }),
    ],
    [1, 1, 1],
  )

  await opaqueAsset('mkt-wall.png', 'mkt-wall', 288, 180, { tile: true })
  await transparentStandalone('mkt-depth.png', 'mkt-depth', 288, 180, {
    tile: true,
    trim: false,
  })
  await opaqueAsset('mkt-floor.png', 'mkt-floor', 512, 48, {
    tile: true,
    trimWhite: true,
  })

  await gridAssets(
    'stairs-h',
    2,
    1,
    [
      entry('stairs-h-desktop.png', 0, 40, 176, 'stairs-h-d', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
      entry('stairs-h-mobile.png', 1, 30, 265, 'stairs-h-m', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
    ],
    [2],
  )
  await gridAssets(
    'stairs-i',
    2,
    1,
    [
      entry('stairs-i-desktop.png', 0, 40, 176, 'stairs-i-d', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
      entry('stairs-i-mobile.png', 1, 30, 265, 'stairs-i-m', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
    ],
    [2],
  )
  await gridAssets(
    'stairs-c',
    1,
    1,
    [
      entry('stairs-c-mobile.png', 0, 30, 265, 'stairs-c-m', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
    ],
    [1],
  )
  await gridAssets(
    'stairs-o',
    2,
    1,
    [
      entry('stairs-o-desktop.png', 0, 40, 176, 'stairs-o-d', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
      entry('stairs-o-mobile.png', 1, 30, 265, 'stairs-o-m', 'bottom-left', {
        fit: 'fill',
        padding: 0,
      }),
    ],
    [2],
  )

  await buildStall(
    'uses',
    [
      { name: 'screens', frame: 1, width: 32, height: 28 },
      { name: 'screens', frame: 2, width: 32, height: 28 },
      { name: 'screens', frame: 3, width: 32, height: 28 },
    ],
    { layoutCounts: [4, 4, 4, 3] },
  )
  await buildStall(
    'games',
    [
      { name: 'coin', frame: 1, width: 40, height: 16 },
      { name: 'coin', frame: 2, width: 40, height: 16 },
      { name: 'marquee', frame: 1, width: 48, height: 12 },
      { name: 'marquee', frame: 2, width: 48, height: 12 },
      { name: 'marquee', frame: 3, width: 48, height: 12 },
    ],
    { keeperWidth: 38, layoutCounts: [4, 4, 4, 4] },
  )
  await buildStall(
    'travel',
    [
      { name: 'cage', frame: 1, width: 36, height: 28 },
      { name: 'cage', frame: 2, width: 36, height: 28 },
    ],
    { layoutCounts: [4, 4, 4, 1] },
  )

  const manual = stallBase('manual')
  await gridAssets('stall-manual', 4, 3, manual.entries, [4, 4, 4])
  await gridAssets(
    'stall-manual-steam',
    3,
    1,
    [
      entry('stall-manual-prop-steam-1.png', 0, 40, 32, 'manual-steam'),
      entry('stall-manual-prop-steam-2.png', 1, 40, 32, 'manual-steam'),
      entry('stall-manual-prop-steam-3.png', 2, 40, 32, 'manual-steam'),
    ],
    [3],
  )

  await buildStall(
    'serve',
    [
      { name: 'scale', frame: 1, width: 24, height: 40 },
      { name: 'scale', frame: 2, width: 24, height: 40 },
    ],
    { idleCount: 3, layoutCounts: [4, 4, 4, 2] },
  )
  await buildStall(
    'projects',
    [
      { name: 'drip', frame: 1, width: 20, height: 24 },
      { name: 'drip', frame: 2, width: 20, height: 24 },
      { name: 'drip', frame: 3, width: 20, height: 24 },
    ],
    { layoutCounts: [4, 4, 4, 2] },
  )
  await buildStall(
    'talks',
    [
      { name: 'static', frame: 1, width: 32, height: 28 },
      { name: 'static', frame: 2, width: 32, height: 28 },
    ],
    { layoutCounts: [4, 4, 4, 1] },
  )
  await buildStall(
    'papers',
    [
      { name: 'line', frame: 1, width: 48, height: 24, anchor: 'top-center' },
      { name: 'line', frame: 2, width: 48, height: 24, anchor: 'top-center' },
    ],
    { layoutCounts: [4, 4, 4, 1] },
  )

  await gridAssets(
    'livingness',
    5,
    4,
    [
      entry('live-lamp-1.png', 0, 24, 24, 'live-lamp'),
      entry('live-lamp-2.png', 1, 24, 24, 'live-lamp'),
      entry('live-ac-1.png', 2, 40, 28, 'live-ac'),
      entry('live-ac-2.png', 3, 40, 28, 'live-ac'),
      entry('live-ac-3.png', 4, 40, 28, 'live-ac'),
      entry('live-vent-1.png', 5, 32, 24, 'live-vent'),
      entry('live-vent-2.png', 6, 32, 24, 'live-vent'),
      entry('live-vent-3.png', 7, 32, 24, 'live-vent'),
      entry('live-cables.png', 8, 96, 40, 'live-cables', 'top-center'),
      entry('live-crow-1.png', 9, 16, 12, 'live-crow'),
      entry('live-crow-2.png', 10, 16, 12, 'live-crow'),
      entry('live-rat-1.png', 11, 16, 8, 'live-rat'),
      entry('live-rat-2.png', 12, 16, 8, 'live-rat'),
      entry('live-sky-blink-1.png', 13, 8, 8, 'live-blink'),
      entry('live-sky-blink-2.png', 14, 8, 8, 'live-blink'),
      entry('live-glitch-1.png', 15, 96, 12, 'live-glitch'),
      entry('live-glitch-2.png', 16, 96, 12, 'live-glitch'),
      entry('live-puddle-1.png', 17, 48, 16, 'live-puddle'),
      entry('live-puddle-2.png', 18, 48, 16, 'live-puddle'),
    ],
    [5, 5, 5, 4],
  )

  await gridAssets(
    'props',
    4,
    2,
    [
      entry(
        'prop-lightstrip-1.png',
        0,
        96,
        24,
        'prop-lightstrip',
        'top-center',
      ),
      entry(
        'prop-lightstrip-2.png',
        1,
        96,
        24,
        'prop-lightstrip',
        'top-center',
      ),
      entry(
        'prop-lightstrip-3.png',
        2,
        96,
        24,
        'prop-lightstrip',
        'top-center',
      ),
      entry('prop-crate-a.png', 3, 32, 32, 'prop-crate-a'),
      entry('prop-crate-b.png', 4, 32, 32, 'prop-crate-b'),
      entry('prop-bottles.png', 5, 24, 24, 'prop-bottles'),
      entry('prop-hydrant.png', 6, 24, 48, 'prop-hydrant'),
      entry('prop-cablefall.png', 7, 96, 40, 'prop-cablefall', 'top-center'),
    ],
    [4, 4],
  )

  // Preserve semantic, transparent production sheets alongside untouched sources.
  for (const key of [
    'p1-bg-band',
    'p1-buildings',
    'p1-interactives',
    'slab-pipes',
    'mkt-depth',
    'stairs',
    'stairs-h',
    'stairs-i',
    'stairs-c',
    'stairs-o',
    'stall-uses',
    'stall-games',
    'stall-travel',
    'stall-manual',
    'stall-manual-steam',
    'stall-serve',
    'stall-projects',
    'stall-talks',
    'stall-papers',
    'livingness',
    'props',
  ]) {
    const keyed = await chromaKey(sourcePath(key))
    await sharp(keyed)
      .png({ compressionLevel: 9 })
      .toFile(path.join(SHEETS, `${key}.png`))
  }

  for (const key of ['p1-bg-full', 'p1-street', 'mkt-wall', 'mkt-floor']) {
    await copyFile(sourcePath(key), path.join(SHEETS, `${key}.png`))
  }

  manifest.sort((a, b) => a.file.localeCompare(b.file))
  await writeFile(
    path.join(OUT, 'manifest.json'),
    `${JSON.stringify({ scale: SCALE, count: manifest.length, assets: manifest }, null, 2)}\n`,
  )
  console.log(`Built ${manifest.length} bazaar assets in ${ASSETS}`)
}

await main()
