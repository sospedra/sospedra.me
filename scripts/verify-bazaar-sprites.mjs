import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const bazaar = path.join(root, 'public/images/bazaar')
const assetsDir = path.join(bazaar, 'assets')
const manifest = JSON.parse(
  await readFile(path.join(bazaar, 'manifest.json'), 'utf8'),
)
const errors = []
let transparentAssets = 0
let tileableAssets = 0

const pngs = (await readdir(assetsDir))
  .filter((file) => file.endsWith('.png'))
  .sort()
if (pngs.length !== manifest.count) {
  errors.push(
    `file count ${pngs.length} does not match manifest count ${manifest.count}`,
  )
}

for (const asset of manifest.assets) {
  const file = path.join(assetsDir, asset.file)
  const image = sharp(file)
  const meta = await image.metadata()
  const expectedWidth = asset.vpx.width * manifest.scale
  const expectedHeight = asset.vpx.height * manifest.scale

  if (meta.width !== expectedWidth || meta.height !== expectedHeight) {
    errors.push(
      `${asset.file}: ${meta.width}x${meta.height}, expected ${expectedWidth}x${expectedHeight}`,
    )
  }
  if (Boolean(meta.hasAlpha) !== Boolean(asset.alpha)) {
    errors.push(
      `${asset.file}: alpha=${meta.hasAlpha}, expected ${asset.alpha}`,
    )
  }

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (asset.alpha) {
    transparentAssets += 1
    let hasTransparentPixel = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) {
        hasTransparentPixel = true
        break
      }
    }
    if (!hasTransparentPixel)
      errors.push(`${asset.file}: expected transparent pixels`)
  }

  // Every exported virtual pixel must be a uniform 8x8 nearest-neighbor block.
  const block = manifest.scale
  outer: for (let y = 0; y < info.height; y += block) {
    for (let x = 0; x < info.width; x += block) {
      const base = (y * info.width + x) * 4
      for (let by = 0; by < block; by += 1) {
        for (let bx = 0; bx < block; bx += 1) {
          const offset = ((y + by) * info.width + x + bx) * 4
          if (
            data[offset] !== data[base] ||
            data[offset + 1] !== data[base + 1] ||
            data[offset + 2] !== data[base + 2] ||
            data[offset + 3] !== data[base + 3]
          ) {
            errors.push(
              `${asset.file}: non-uniform ${block}x${block} virtual pixel block`,
            )
            break outer
          }
        }
      }
    }
  }

  if (asset.tileableX) {
    tileableAssets += 1
    for (let y = 0; y < info.height; y += 1) {
      const first = y * info.width * 4
      const last = (y * info.width + info.width - 1) * 4
      for (let channel = 0; channel < 4; channel += 1) {
        if (data[first + channel] !== data[last + channel]) {
          errors.push(`${asset.file}: left/right seam mismatch at y=${y}`)
          y = info.height
          break
        }
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(
  `Verified ${manifest.count} assets: exact dimensions, ${transparentAssets} alpha sprites, ` +
    `${tileableAssets} seamless tiles, and uniform ${manifest.scale}x pixel blocks.`,
)
