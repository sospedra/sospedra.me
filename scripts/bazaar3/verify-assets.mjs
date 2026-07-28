#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const SCHEMA_VERSION = 1
const SHA256_PATTERN = /^[a-f0-9]{64}$/i
const MAX_EXAMPLES = 8

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isPositiveInteger = (value) =>
  Number.isInteger(value) && Number(value) > 0

const isNonNegativeInteger = (value) =>
  Number.isInteger(value) && Number(value) >= 0

const issue = (code, message, context = {}) => ({
  code,
  message,
  ...context,
})

const pushIssue = (report, local, severity, code, message, context = {}) => {
  const value = issue(code, message, context)
  report[severity].push(value)
  local?.[severity]?.push(value)
}

const parseHexColor = (hex) => {
  if (typeof hex !== 'string' || !/^#[a-f0-9]{6}$/i.test(hex)) return null
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

const sha256Buffer = (data) => createHash('sha256').update(data).digest('hex')

export const sha256File = async (file) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

const resolveInside = (root, file) => {
  const resolved = path.resolve(root, file)
  const relative = path.relative(root, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes assetRoot: ${file}`)
  }
  return resolved
}

const validateAlphaRule = (value, at, errors) => {
  if (value === false || value === undefined) return
  if (!isObject(value)) {
    errors.push(issue('MANIFEST_ALPHA', `${at} must be false or an object`))
    return
  }
  if (
    value.mode !== undefined &&
    !['any', 'binary', 'opaque'].includes(value.mode)
  ) {
    errors.push(
      issue(
        'MANIFEST_ALPHA_MODE',
        `${at}.mode must be "any", "binary", or "opaque"`,
      ),
    )
  }
  for (const field of [
    'requireChannel',
    'requireTransparent',
    'requireOpaque',
  ]) {
    if (value[field] !== undefined && typeof value[field] !== 'boolean') {
      errors.push(
        issue('MANIFEST_ALPHA_FIELD', `${at}.${field} must be a boolean`),
      )
    }
  }
}

const validatePaletteRule = (value, at, errors) => {
  if (value === false || value === undefined) return
  if (!isObject(value)) {
    errors.push(issue('MANIFEST_PALETTE', `${at} must be false or an object`))
    return
  }
  if (!isPositiveInteger(value.maxColors)) {
    errors.push(
      issue(
        'MANIFEST_PALETTE_MAX',
        `${at}.maxColors must be a positive integer`,
      ),
    )
  }
  if (
    value.exactColors !== undefined &&
    !isPositiveInteger(value.exactColors)
  ) {
    errors.push(
      issue(
        'MANIFEST_PALETTE_EXACT',
        `${at}.exactColors must be a positive integer`,
      ),
    )
  }
  if (
    value.minAlpha !== undefined &&
    (!isNonNegativeInteger(value.minAlpha) || value.minAlpha > 255)
  ) {
    errors.push(
      issue(
        'MANIFEST_PALETTE_ALPHA',
        `${at}.minAlpha must be an integer from 0 to 255`,
      ),
    )
  }
  if (
    value.includeAlpha !== undefined &&
    typeof value.includeAlpha !== 'boolean'
  ) {
    errors.push(
      issue(
        'MANIFEST_PALETTE_INCLUDE_ALPHA',
        `${at}.includeAlpha must be a boolean`,
      ),
    )
  }
}

const validateRect = (value, at, errors) => {
  if (!isObject(value)) {
    errors.push(issue('MANIFEST_RECT', `${at} must be an object`))
    return
  }
  for (const field of ['x', 'y']) {
    if (!isNonNegativeInteger(value[field])) {
      errors.push(issue('MANIFEST_RECT_ORIGIN', `${at}.${field} must be >= 0`))
    }
  }
  for (const field of ['width', 'height']) {
    if (!isPositiveInteger(value[field])) {
      errors.push(issue('MANIFEST_RECT_SIZE', `${at}.${field} must be > 0`))
    }
  }
}

const validatePixelBlockRule = (value, at, errors) => {
  if (value === false || value === undefined) return
  if (!isObject(value)) {
    errors.push(
      issue('MANIFEST_PIXEL_BLOCK', `${at} must be false or an object`),
    )
    return
  }
  if (!isPositiveInteger(value.size)) {
    errors.push(
      issue(
        'MANIFEST_PIXEL_BLOCK_SIZE',
        `${at}.size must be a positive integer`,
      ),
    )
  }
  if (value.rect !== undefined) validateRect(value.rect, `${at}.rect`, errors)
  if (
    value.ignoreFullyTransparent !== undefined &&
    typeof value.ignoreFullyTransparent !== 'boolean'
  ) {
    errors.push(
      issue(
        'MANIFEST_PIXEL_BLOCK_TRANSPARENT',
        `${at}.ignoreFullyTransparent must be a boolean`,
      ),
    )
  }
}

const validateForbiddenColors = (value, at, errors) => {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    errors.push(issue('MANIFEST_FORBIDDEN_COLORS', `${at} must be an array`))
    return
  }
  for (const [index, color] of value.entries()) {
    const colorAt = `${at}[${index}]`
    if (!isObject(color)) {
      errors.push(
        issue('MANIFEST_FORBIDDEN_COLOR', `${colorAt} must be an object`),
      )
      continue
    }
    if (!parseHexColor(color.hex)) {
      errors.push(
        issue(
          'MANIFEST_FORBIDDEN_COLOR_HEX',
          `${colorAt}.hex must use #rrggbb`,
        ),
      )
    }
    for (const field of ['tolerance', 'minAlpha']) {
      if (
        color[field] !== undefined &&
        (!isNonNegativeInteger(color[field]) || color[field] > 255)
      ) {
        errors.push(
          issue(
            'MANIFEST_FORBIDDEN_COLOR_FIELD',
            `${colorAt}.${field} must be an integer from 0 to 255`,
          ),
        )
      }
    }
    if (
      color.maxPixels !== undefined &&
      !isNonNegativeInteger(color.maxPixels)
    ) {
      errors.push(
        issue(
          'MANIFEST_FORBIDDEN_COLOR_FIELD',
          `${colorAt}.maxPixels must be an integer >= 0`,
        ),
      )
    }
  }
}

const validateChecks = (checks, at, errors) => {
  if (checks === undefined) return
  if (!isObject(checks)) {
    errors.push(issue('MANIFEST_CHECKS', `${at} must be an object`))
    return
  }
  validateAlphaRule(checks.alpha, `${at}.alpha`, errors)
  validatePaletteRule(checks.palette, `${at}.palette`, errors)
  validatePixelBlockRule(checks.pixelBlock, `${at}.pixelBlock`, errors)
  validateForbiddenColors(
    checks.forbiddenColors,
    `${at}.forbiddenColors`,
    errors,
  )
}

export const validateManifestShape = (manifest) => {
  const errors = []
  const warnings = []
  if (!isObject(manifest)) {
    return {
      errors: [issue('MANIFEST_ROOT', 'Manifest must be a JSON object')],
      warnings,
    }
  }

  if (manifest.version !== SCHEMA_VERSION) {
    errors.push(
      issue('MANIFEST_VERSION', `Manifest version must be ${SCHEMA_VERSION}`),
    )
  }
  if (
    typeof manifest.assetRoot !== 'string' ||
    manifest.assetRoot.length === 0
  ) {
    errors.push(
      issue('MANIFEST_ASSET_ROOT', 'assetRoot must be a non-empty string'),
    )
  }
  validateChecks(manifest.defaults, 'defaults', errors)

  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    errors.push(issue('MANIFEST_ASSETS', 'assets must be a non-empty array'))
  }

  const assetIds = new Set()
  const assetsById = new Map()
  for (const [index, asset] of (manifest.assets ?? []).entries()) {
    const at = `assets[${index}]`
    if (!isObject(asset)) {
      errors.push(issue('MANIFEST_ASSET', `${at} must be an object`))
      continue
    }
    if (typeof asset.id !== 'string' || asset.id.length === 0) {
      errors.push(
        issue('MANIFEST_ASSET_ID', `${at}.id must be a non-empty string`),
      )
    } else if (assetIds.has(asset.id)) {
      errors.push(
        issue('MANIFEST_ASSET_DUPLICATE', `${at}.id duplicates "${asset.id}"`),
      )
    } else {
      assetIds.add(asset.id)
      assetsById.set(asset.id, asset)
    }
    if (typeof asset.file !== 'string' || asset.file.length === 0) {
      errors.push(
        issue('MANIFEST_ASSET_FILE', `${at}.file must be a non-empty string`),
      )
    }
    if (!isPositiveInteger(asset.width) || !isPositiveInteger(asset.height)) {
      errors.push(
        issue(
          'MANIFEST_ASSET_SIZE',
          `${at}.width and ${at}.height must be positive integers`,
        ),
      )
    }
    if (
      asset.role !== undefined &&
      ![
        'animation-cel',
        'effect-cel',
        'motion-mask',
        'static-layer',
        'environment',
        'reference',
      ].includes(asset.role)
    ) {
      errors.push(issue('MANIFEST_ASSET_ROLE', `${at}.role is not supported`))
    }
    if (asset.sha256 !== undefined && !SHA256_PATTERN.test(asset.sha256)) {
      errors.push(
        issue(
          'MANIFEST_ASSET_HASH',
          `${at}.sha256 must be a 64-character hexadecimal SHA-256`,
        ),
      )
    }
    if (asset.role === 'static-layer' && !asset.sha256) {
      errors.push(
        issue(
          'MANIFEST_STATIC_HASH_REQUIRED',
          `${at} is a static layer and must declare sha256`,
        ),
      )
    }
    validateChecks(asset.checks, `${at}.checks`, errors)
  }

  const paletteFamilies = Array.isArray(manifest.paletteFamilies)
    ? manifest.paletteFamilies
    : []
  if (
    manifest.paletteFamilies !== undefined &&
    !Array.isArray(manifest.paletteFamilies)
  ) {
    errors.push(
      issue(
        'MANIFEST_PALETTE_FAMILIES',
        'paletteFamilies must be an array when supplied',
      ),
    )
  }

  const paletteFamilyIds = new Set()
  for (const [index, family] of paletteFamilies.entries()) {
    const at = `paletteFamilies[${index}]`
    if (!isObject(family)) {
      errors.push(issue('MANIFEST_PALETTE_FAMILY', `${at} must be an object`))
      continue
    }
    if (typeof family.id !== 'string' || family.id.length === 0) {
      errors.push(
        issue(
          'MANIFEST_PALETTE_FAMILY_ID',
          `${at}.id must be a non-empty string`,
        ),
      )
    } else if (paletteFamilyIds.has(family.id)) {
      errors.push(
        issue(
          'MANIFEST_PALETTE_FAMILY_DUPLICATE',
          `${at}.id duplicates "${family.id}"`,
        ),
      )
    } else {
      paletteFamilyIds.add(family.id)
    }
    if (
      typeof family.reference !== 'string' ||
      !assetIds.has(family.reference)
    ) {
      errors.push(
        issue(
          'MANIFEST_PALETTE_FAMILY_REFERENCE',
          `${at}.reference must reference an asset`,
        ),
      )
    }
    if (!['subset', 'identical'].includes(family.mode)) {
      errors.push(
        issue(
          'MANIFEST_PALETTE_FAMILY_MODE',
          `${at}.mode must be "subset" or "identical"`,
        ),
      )
    }
    if (!Array.isArray(family.members) || family.members.length === 0) {
      errors.push(
        issue(
          'MANIFEST_PALETTE_FAMILY_MEMBERS',
          `${at}.members must be a non-empty array`,
        ),
      )
    } else {
      for (const [memberIndex, member] of family.members.entries()) {
        if (typeof member !== 'string' || !assetIds.has(member)) {
          errors.push(
            issue(
              'MANIFEST_PALETTE_FAMILY_MEMBER',
              `${at}.members[${memberIndex}] does not reference an asset`,
            ),
          )
        }
      }
    }
    if (
      family.maxUnionColors !== undefined &&
      !isPositiveInteger(family.maxUnionColors)
    ) {
      errors.push(
        issue(
          'MANIFEST_PALETTE_FAMILY_MAX',
          `${at}.maxUnionColors must be a positive integer`,
        ),
      )
    }
  }
  const animationIds = new Set()
  for (const [index, animation] of (manifest.animations ?? []).entries()) {
    const at = `animations[${index}]`
    if (!isObject(animation)) {
      errors.push(issue('MANIFEST_ANIMATION', `${at} must be an object`))
      continue
    }
    if (typeof animation.id !== 'string' || animation.id.length === 0) {
      errors.push(
        issue('MANIFEST_ANIMATION_ID', `${at}.id must be a non-empty string`),
      )
    } else if (animationIds.has(animation.id)) {
      errors.push(
        issue(
          'MANIFEST_ANIMATION_DUPLICATE',
          `${at}.id duplicates "${animation.id}"`,
        ),
      )
    } else {
      animationIds.add(animation.id)
    }

    if (!Array.isArray(animation.frames) || animation.frames.length < 2) {
      errors.push(
        issue(
          'MANIFEST_ANIMATION_FRAMES',
          `${at}.frames must contain at least two asset ids`,
        ),
      )
    } else {
      for (const [frameIndex, frame] of animation.frames.entries()) {
        if (typeof frame !== 'string' || !assetIds.has(frame)) {
          errors.push(
            issue(
              'MANIFEST_ANIMATION_FRAME_REF',
              `${at}.frames[${frameIndex}] does not reference an asset`,
            ),
          )
        }
      }
      if (new Set(animation.frames).size !== animation.frames.length) {
        warnings.push(
          issue(
            'MANIFEST_ANIMATION_FRAME_REUSED',
            `${at}.frames contains a repeated asset id`,
          ),
        )
      }
    }

    if (!isObject(animation.rootAnchor)) {
      errors.push(
        issue('MANIFEST_ROOT_ANCHOR_REQUIRED', `${at}.rootAnchor is required`),
      )
    } else {
      for (const field of ['x', 'y', 'lockRadius']) {
        if (!isNonNegativeInteger(animation.rootAnchor[field])) {
          errors.push(
            issue(
              'MANIFEST_ROOT_ANCHOR_FIELD',
              `${at}.rootAnchor.${field} must be an integer >= 0`,
            ),
          )
        }
      }
      if (
        animation.rootAnchor.requireOpaque !== undefined &&
        typeof animation.rootAnchor.requireOpaque !== 'boolean'
      ) {
        errors.push(
          issue(
            'MANIFEST_ROOT_ANCHOR_OPAQUE',
            `${at}.rootAnchor.requireOpaque must be a boolean`,
          ),
        )
      }
      if (
        animation.rootAnchor.excludeFromMotionMask !== undefined &&
        typeof animation.rootAnchor.excludeFromMotionMask !== 'boolean'
      ) {
        errors.push(
          issue(
            'MANIFEST_ROOT_ANCHOR_MASK',
            `${at}.rootAnchor.excludeFromMotionMask must be a boolean`,
          ),
        )
      }
    }

    if (animation.lockedRegions !== undefined) {
      if (!Array.isArray(animation.lockedRegions)) {
        errors.push(
          issue(
            'MANIFEST_LOCKED_REGIONS',
            `${at}.lockedRegions must be an array`,
          ),
        )
      } else {
        const regionIds = new Set()
        for (const [regionIndex, region] of animation.lockedRegions.entries()) {
          const regionAt = `${at}.lockedRegions[${regionIndex}]`
          if (!isObject(region)) {
            errors.push(
              issue('MANIFEST_LOCKED_REGION', `${regionAt} must be an object`),
            )
            continue
          }
          validateRect(region, regionAt, errors)
          if (typeof region.id !== 'string' || region.id.length === 0) {
            errors.push(
              issue(
                'MANIFEST_LOCKED_REGION_ID',
                `${regionAt}.id must be a non-empty string`,
              ),
            )
          } else if (regionIds.has(region.id)) {
            errors.push(
              issue(
                'MANIFEST_LOCKED_REGION_DUPLICATE',
                `${regionAt}.id duplicates "${region.id}"`,
              ),
            )
          } else {
            regionIds.add(region.id)
          }
          for (const field of ['requireOpaque', 'excludeFromMotionMask']) {
            if (
              region[field] !== undefined &&
              typeof region[field] !== 'boolean'
            ) {
              errors.push(
                issue(
                  'MANIFEST_LOCKED_REGION_FIELD',
                  `${regionAt}.${field} must be a boolean`,
                ),
              )
            }
          }
        }
      }
    }

    if (animation.allowedMotionMask !== undefined) {
      const mask = animation.allowedMotionMask
      if (!isObject(mask) || !assetIds.has(mask.asset)) {
        errors.push(
          issue(
            'MANIFEST_MOTION_MASK_REF',
            `${at}.allowedMotionMask.asset must reference an asset`,
          ),
        )
      } else if (assetsById.get(mask.asset)?.role !== 'motion-mask') {
        errors.push(
          issue(
            'MANIFEST_MOTION_MASK_ROLE',
            `${at}.allowedMotionMask.asset must have role "motion-mask"`,
          ),
        )
      }
      if (
        mask?.threshold !== undefined &&
        (!isPositiveInteger(mask.threshold) || mask.threshold > 255)
      ) {
        errors.push(
          issue(
            'MANIFEST_MOTION_MASK_THRESHOLD',
            `${at}.allowedMotionMask.threshold must be from 1 to 255`,
          ),
        )
      }
    }

    if (animation.staticLayers !== undefined) {
      if (!Array.isArray(animation.staticLayers)) {
        errors.push(
          issue(
            'MANIFEST_STATIC_LAYERS',
            `${at}.staticLayers must be an array`,
          ),
        )
      } else {
        for (const [layerIndex, assetId] of animation.staticLayers.entries()) {
          const asset = assetsById.get(assetId)
          if (!asset) {
            errors.push(
              issue(
                'MANIFEST_STATIC_LAYER_REF',
                `${at}.staticLayers[${layerIndex}] does not reference an asset`,
              ),
            )
          } else if (asset.role !== 'static-layer' || !asset.sha256) {
            errors.push(
              issue(
                'MANIFEST_STATIC_LAYER_LOCK',
                `${at}.staticLayers[${layerIndex}] must reference a hashed static layer`,
              ),
            )
          }
        }
      }
    }
  }

  if (
    manifest.animations !== undefined &&
    !Array.isArray(manifest.animations)
  ) {
    errors.push(
      issue('MANIFEST_ANIMATIONS', 'animations must be an array when supplied'),
    )
  }

  return { errors, warnings }
}

const resolveChecks = (defaults = {}, assetChecks = {}) => {
  const merged = { ...defaults, ...assetChecks }
  for (const key of ['alpha', 'palette', 'pixelBlock']) {
    if (isObject(defaults[key]) && isObject(assetChecks[key])) {
      merged[key] = { ...defaults[key], ...assetChecks[key] }
    }
  }
  return merged
}

const inspectAlpha = (data) => {
  let transparent = 0
  let partial = 0
  let opaque = 0
  for (let offset = 3; offset < data.length; offset += 4) {
    const alpha = data[offset]
    if (alpha === 0) transparent += 1
    else if (alpha === 255) opaque += 1
    else partial += 1
  }
  return { transparent, partial, opaque }
}

const inspectPalette = (data, rule) => {
  const colors = new Set()
  const minAlpha = rule.minAlpha ?? 1
  const includeAlpha = rule.includeAlpha ?? false
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3]
    if (alpha < minAlpha) continue
    const rgb =
      (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]
    const rgbHex = rgb.toString(16).padStart(6, '0')
    colors.add(
      includeAlpha
        ? `#${rgbHex}${alpha.toString(16).padStart(2, '0')}`
        : `#${rgbHex}`,
    )
  }
  return { count: colors.size, values: [...colors].sort() }
}

const inspectForbiddenColors = (data, width, rules) => {
  const results = []
  for (const rule of rules) {
    const target = parseHexColor(rule.hex)
    if (!target) continue
    const tolerance = rule.tolerance ?? 0
    const minAlpha = rule.minAlpha ?? 1
    const examples = []
    let pixels = 0
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] < minAlpha) continue
      if (
        Math.abs(data[offset] - target.r) <= tolerance &&
        Math.abs(data[offset + 1] - target.g) <= tolerance &&
        Math.abs(data[offset + 2] - target.b) <= tolerance
      ) {
        pixels += 1
        if (examples.length < MAX_EXAMPLES) {
          const pixel = offset / 4
          examples.push({ x: pixel % width, y: Math.floor(pixel / width) })
        }
      }
    }
    results.push({
      hex: rule.hex.toLowerCase(),
      tolerance,
      minAlpha,
      maxPixels: rule.maxPixels ?? 0,
      pixels,
      examples,
    })
  }
  return results
}

const inspectPixelBlocks = (data, width, height, rule) => {
  const size = rule.size
  const rect = rule.rect ?? { x: 0, y: 0, width, height }
  const result = {
    size,
    rect,
    blocks: 0,
    skippedTransparentBlocks: 0,
    mismatchedBlocks: 0,
    examples: [],
  }

  if (
    rect.x + rect.width > width ||
    rect.y + rect.height > height ||
    rect.width % size !== 0 ||
    rect.height % size !== 0
  ) {
    return {
      ...result,
      configurationError:
        'rect must fit the image and its width/height must divide by size',
    }
  }

  for (let y = rect.y; y < rect.y + rect.height; y += size) {
    for (let x = rect.x; x < rect.x + rect.width; x += size) {
      result.blocks += 1
      let allTransparent = true
      let mismatch = false
      const baseOffset = (y * width + x) * 4

      for (let blockY = 0; blockY < size; blockY += 1) {
        for (let blockX = 0; blockX < size; blockX += 1) {
          const offset = ((y + blockY) * width + x + blockX) * 4
          if (data[offset + 3] !== 0) allTransparent = false
          if (
            data[offset] !== data[baseOffset] ||
            data[offset + 1] !== data[baseOffset + 1] ||
            data[offset + 2] !== data[baseOffset + 2] ||
            data[offset + 3] !== data[baseOffset + 3]
          ) {
            mismatch = true
          }
        }
      }

      if (allTransparent && rule.ignoreFullyTransparent) {
        result.skippedTransparentBlocks += 1
        continue
      }
      if (mismatch) {
        result.mismatchedBlocks += 1
        if (result.examples.length < MAX_EXAMPLES)
          result.examples.push({ x, y })
      }
    }
  }
  return result
}

const readPng = async (file) => {
  const metadata = await sharp(file, {
    failOn: 'error',
    limitInputPixels: false,
  }).metadata()
  const { data, info } = await sharp(file, {
    failOn: 'error',
    limitInputPixels: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { metadata, data, info }
}

const validateAsset = async ({ asset, assetRoot, defaults, report }) => {
  const result = {
    id: asset.id,
    file: asset.file,
    role: asset.role ?? null,
    status: 'pass',
    errors: [],
    warnings: [],
  }
  const emit = (severity, code, message, context = {}) =>
    pushIssue(report, result, severity, code, message, {
      asset: asset.id,
      file: asset.file,
      ...context,
    })

  let file
  try {
    file = resolveInside(assetRoot, asset.file)
  } catch (error) {
    emit('errors', 'ASSET_PATH_ESCAPE', error.message)
    result.status = 'fail'
    return result
  }

  let png
  try {
    png = await readPng(file)
  } catch (error) {
    emit('errors', 'ASSET_READ', `Could not read PNG: ${error.message}`)
    result.status = 'fail'
    return result
  }

  const { metadata, data, info } = png
  result.actual = {
    width: info.width,
    height: info.height,
    format: metadata.format ?? null,
    channels: metadata.channels ?? null,
    hasAlpha: Boolean(metadata.hasAlpha),
    bytes: metadata.size ?? null,
  }

  if (metadata.format !== 'png') {
    emit('errors', 'ASSET_FORMAT', `Expected PNG, got ${metadata.format}`)
  }
  if (info.width !== asset.width || info.height !== asset.height) {
    emit(
      'errors',
      'ASSET_DIMENSIONS',
      `Got ${info.width}x${info.height}; expected ${asset.width}x${asset.height}`,
      {
        actual: { width: info.width, height: info.height },
        expected: { width: asset.width, height: asset.height },
      },
    )
  }

  try {
    result.sha256 = await sha256File(file)
    result.hashLocked = Boolean(asset.sha256)
    if (asset.sha256 && result.sha256 !== asset.sha256.toLowerCase()) {
      emit(
        'errors',
        'ASSET_HASH',
        `SHA-256 ${result.sha256} does not match locked ${asset.sha256}`,
      )
    }
  } catch (error) {
    emit('errors', 'ASSET_HASH_READ', `Could not hash asset: ${error.message}`)
  }

  const checks = resolveChecks(defaults, asset.checks)
  if (checks.alpha !== false && isObject(checks.alpha)) {
    const counts = inspectAlpha(data)
    const rule = { mode: 'any', ...checks.alpha }
    result.alpha = { ...counts, rule }
    if (rule.requireChannel && !metadata.hasAlpha) {
      emit('errors', 'ALPHA_CHANNEL', 'PNG must contain an alpha channel')
    }
    if (rule.mode === 'opaque' && counts.transparent + counts.partial > 0) {
      emit(
        'errors',
        'ALPHA_OPAQUE',
        `Expected opaque pixels only; found ${counts.transparent} transparent and ${counts.partial} partial`,
      )
    }
    if (rule.mode === 'binary' && counts.partial > 0) {
      emit(
        'errors',
        'ALPHA_BINARY',
        `Expected binary alpha; found ${counts.partial} partially transparent pixels`,
      )
    }
    if (rule.requireTransparent && counts.transparent === 0) {
      emit(
        'errors',
        'ALPHA_TRANSPARENT_REQUIRED',
        'Expected at least one fully transparent pixel',
      )
    }
    if (rule.requireOpaque && counts.opaque === 0) {
      emit(
        'errors',
        'ALPHA_OPAQUE_REQUIRED',
        'Expected at least one fully opaque pixel',
      )
    }
  }

  if (checks.palette !== false && isObject(checks.palette)) {
    const palette = inspectPalette(data, checks.palette)
    result.palette = {
      colors: palette.count,
      values: palette.values,
      rule: checks.palette,
    }
    if (palette.count > checks.palette.maxColors) {
      emit(
        'errors',
        'PALETTE_MAX',
        `Found ${palette.count} visible colors; maximum is ${checks.palette.maxColors}`,
      )
    }
    if (
      checks.palette.exactColors !== undefined &&
      palette.count !== checks.palette.exactColors
    ) {
      emit(
        'errors',
        'PALETTE_EXACT',
        `Found ${palette.count} visible colors; expected exactly ${checks.palette.exactColors}`,
      )
    }
  }

  if (Array.isArray(checks.forbiddenColors)) {
    result.forbiddenColors = inspectForbiddenColors(
      data,
      info.width,
      checks.forbiddenColors,
    )
    for (const color of result.forbiddenColors) {
      if (color.pixels > color.maxPixels) {
        emit(
          'errors',
          'FORBIDDEN_COLOR',
          `Found ${color.pixels} pixels matching ${color.hex} ±${color.tolerance}; maximum is ${color.maxPixels}`,
          { color },
        )
      }
    }
  }

  if (checks.pixelBlock !== false && isObject(checks.pixelBlock)) {
    result.pixelBlock = inspectPixelBlocks(
      data,
      info.width,
      info.height,
      checks.pixelBlock,
    )
    if (result.pixelBlock.configurationError) {
      emit(
        'errors',
        'PIXEL_BLOCK_CONFIGURATION',
        result.pixelBlock.configurationError,
      )
    } else if (result.pixelBlock.mismatchedBlocks > 0) {
      emit(
        'errors',
        'PIXEL_BLOCK_UNIFORMITY',
        `${result.pixelBlock.mismatchedBlocks} authored-pixel blocks contain finer detail`,
        { examples: result.pixelBlock.examples },
      )
    }
  }

  result.status = result.errors.length === 0 ? 'pass' : 'fail'
  return result
}

const validatePaletteFamily = ({ family, report }) => {
  const result = {
    id: family.id,
    reference: family.reference,
    mode: family.mode,
    maxUnionColors: family.maxUnionColors ?? null,
    status: 'pass',
    referenceColors: 0,
    unionColors: 0,
    members: [],
    errors: [],
    warnings: [],
  }
  const emit = (severity, code, message, context = {}) =>
    pushIssue(report, result, severity, code, message, {
      paletteFamily: family.id,
      ...context,
    })

  const reference = report.assets.find((asset) => asset.id === family.reference)
  if (!reference?.palette?.values) {
    emit(
      'errors',
      'PALETTE_FAMILY_REFERENCE_UNAVAILABLE',
      `Reference asset "${family.reference}" has no palette evidence`,
    )
    result.status = 'fail'
    return result
  }

  const referenceColors = new Set(reference.palette.values)
  const union = new Set()
  result.referenceColors = referenceColors.size
  for (const assetId of family.members) {
    const asset = report.assets.find((entry) => entry.id === assetId)
    if (!asset?.palette?.values) {
      emit(
        'errors',
        'PALETTE_FAMILY_MEMBER_UNAVAILABLE',
        `Member asset "${assetId}" has no palette evidence`,
        { asset: assetId },
      )
      continue
    }
    const memberColors = new Set(asset.palette.values)
    for (const color of memberColors) union.add(color)
    const outsideReference = [...memberColors]
      .filter((color) => !referenceColors.has(color))
      .sort()
    const missingReference =
      family.mode === 'identical'
        ? [...referenceColors]
            .filter((color) => !memberColors.has(color))
            .sort()
        : []
    const passed =
      outsideReference.length === 0 && missingReference.length === 0
    result.members.push({
      asset: assetId,
      colors: memberColors.size,
      outsideReference,
      missingReference,
      status: passed ? 'pass' : 'fail',
    })
    if (!passed) {
      emit(
        'errors',
        'PALETTE_FAMILY_MISMATCH',
        `Asset "${assetId}" does not satisfy ${family.mode} palette relation to "${family.reference}"`,
        {
          asset: assetId,
          outsideReference,
          missingReference,
        },
      )
    }
  }
  result.unionColors = union.size
  if (
    family.maxUnionColors !== undefined &&
    union.size > family.maxUnionColors
  ) {
    emit(
      'errors',
      'PALETTE_FAMILY_UNION_MAX',
      `Palette family union has ${union.size} colors; maximum is ${family.maxUnionColors}`,
    )
  }
  result.status = result.errors.length === 0 ? 'pass' : 'fail'
  return result
}

const extractPatch = (data, width, anchor) => {
  const side = anchor.lockRadius * 2 + 1
  const patch = Buffer.alloc(side * side * 4)
  let writeOffset = 0
  for (
    let y = anchor.y - anchor.lockRadius;
    y <= anchor.y + anchor.lockRadius;
    y += 1
  ) {
    for (
      let x = anchor.x - anchor.lockRadius;
      x <= anchor.x + anchor.lockRadius;
      x += 1
    ) {
      const readOffset = (y * width + x) * 4
      data.copy(patch, writeOffset, readOffset, readOffset + 4)
      writeOffset += 4
    }
  }
  return patch
}

const extractRectPatch = (data, width, rect) => {
  const patch = Buffer.alloc(rect.width * rect.height * 4)
  let writeOffset = 0
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    const readOffset = (y * width + rect.x) * 4
    const rowBytes = rect.width * 4
    data.copy(patch, writeOffset, readOffset, readOffset + rowBytes)
    writeOffset += rowBytes
  }
  return patch
}

const inspectFrameDifference = (base, frame, mask, threshold, width) => {
  let changedPixels = 0
  let allowedPixels = 0
  let outsideMaskPixels = 0
  const examples = []
  for (let offset = 0; offset < base.length; offset += 4) {
    const changed =
      base[offset] !== frame[offset] ||
      base[offset + 1] !== frame[offset + 1] ||
      base[offset + 2] !== frame[offset + 2] ||
      base[offset + 3] !== frame[offset + 3]
    if (!changed) continue
    changedPixels += 1
    if (mask[offset + 3] >= threshold) {
      allowedPixels += 1
    } else {
      outsideMaskPixels += 1
      if (examples.length < MAX_EXAMPLES) {
        const pixel = offset / 4
        examples.push({ x: pixel % width, y: Math.floor(pixel / width) })
      }
    }
  }
  return { changedPixels, allowedPixels, outsideMaskPixels, examples }
}

const validateAnimation = async ({
  animation,
  assetsById,
  assetRoot,
  report,
}) => {
  const result = {
    id: animation.id,
    status: 'pass',
    frames: animation.frames,
    staticLayers: animation.staticLayers ?? [],
    errors: [],
    warnings: [],
  }
  const emit = (severity, code, message, context = {}) =>
    pushIssue(report, result, severity, code, message, {
      animation: animation.id,
      ...context,
    })

  const frames = []
  for (const assetId of animation.frames) {
    const asset = assetsById.get(assetId)
    try {
      const file = resolveInside(assetRoot, asset.file)
      frames.push({ asset, ...(await readPng(file)) })
    } catch (error) {
      emit(
        'errors',
        'ANIMATION_FRAME_READ',
        `Could not read frame "${assetId}": ${error.message}`,
        { frame: assetId },
      )
    }
  }
  if (frames.length !== animation.frames.length) {
    result.status = 'fail'
    return result
  }

  const first = frames[0]
  const width = first.info.width
  const height = first.info.height
  result.size = { width, height }
  result.sameSize = true
  for (const frame of frames.slice(1)) {
    if (frame.info.width !== width || frame.info.height !== height) {
      result.sameSize = false
      emit(
        'errors',
        'ANIMATION_FRAME_SIZE',
        `Frame "${frame.asset.id}" is ${frame.info.width}x${frame.info.height}; expected ${width}x${height}`,
        { frame: frame.asset.id },
      )
    }
  }

  const anchor = animation.rootAnchor
  const anchorFits =
    anchor.x - anchor.lockRadius >= 0 &&
    anchor.y - anchor.lockRadius >= 0 &&
    anchor.x + anchor.lockRadius < width &&
    anchor.y + anchor.lockRadius < height
  result.rootAnchor = {
    ...anchor,
    inBounds: anchorFits,
    stable: null,
    patchHashes: [],
    opaquePixelsByFrame: [],
  }
  if (!anchorFits) {
    emit(
      'errors',
      'ROOT_ANCHOR_BOUNDS',
      'Root anchor lock patch lies outside the frame',
    )
  } else if (result.sameSize) {
    const basePatch = extractPatch(first.data, width, anchor)
    result.rootAnchor.patchHashes.push(sha256Buffer(basePatch))
    let stable = true
    for (const frame of frames.slice(1)) {
      const patch = extractPatch(frame.data, width, anchor)
      const hash = sha256Buffer(patch)
      result.rootAnchor.patchHashes.push(hash)
      if (!patch.equals(basePatch)) {
        stable = false
        emit(
          'errors',
          'ROOT_ANCHOR_CHANGED',
          `Locked root patch changed in frame "${frame.asset.id}"`,
          { frame: frame.asset.id },
        )
      }
    }
    result.rootAnchor.stable = stable

    if (anchor.requireOpaque) {
      const patchPixels = (anchor.lockRadius * 2 + 1) ** 2
      for (const frame of frames) {
        const patch = extractPatch(frame.data, width, anchor)
        let opaquePixels = 0
        for (let offset = 3; offset < patch.length; offset += 4) {
          if (patch[offset] === 255) opaquePixels += 1
        }
        result.rootAnchor.opaquePixelsByFrame.push({
          frame: frame.asset.id,
          opaquePixels,
          pixels: patchPixels,
        })
        if (opaquePixels !== patchPixels) {
          emit(
            'errors',
            'ROOT_ANCHOR_NOT_OPAQUE',
            `Root anchor lock patch is not fully opaque in frame "${frame.asset.id}"`,
            { frame: frame.asset.id, opaquePixels, pixels: patchPixels },
          )
        }
      }
    } else if (
      basePatch.every((value, index) => index % 4 !== 3 || value === 0)
    ) {
      emit(
        'warnings',
        'ROOT_ANCHOR_TRANSPARENT',
        'Root lock patch is fully transparent and may not prove registration',
      )
    }
  }

  result.lockedRegions = []
  if (result.sameSize) {
    for (const region of animation.lockedRegions ?? []) {
      const regionResult = {
        ...region,
        inBounds:
          region.x + region.width <= width &&
          region.y + region.height <= height,
        stable: null,
        allOpaque: null,
        opaquePixelsByFrame: [],
        patchHashes: [],
        motionMaskPixels: null,
      }
      result.lockedRegions.push(regionResult)
      if (!regionResult.inBounds) {
        emit(
          'errors',
          'LOCKED_REGION_BOUNDS',
          `Locked region "${region.id}" lies outside the frame`,
          { lockedRegion: region.id },
        )
        continue
      }

      const basePatch = extractRectPatch(first.data, width, region)
      regionResult.patchHashes.push(sha256Buffer(basePatch))
      let stable = true
      for (const frame of frames.slice(1)) {
        const patch = extractRectPatch(frame.data, width, region)
        regionResult.patchHashes.push(sha256Buffer(patch))
        if (!patch.equals(basePatch)) {
          stable = false
          emit(
            'errors',
            'LOCKED_REGION_CHANGED',
            `Locked region "${region.id}" changed in frame "${frame.asset.id}"`,
            { lockedRegion: region.id, frame: frame.asset.id },
          )
        }
      }
      regionResult.stable = stable

      const regionPixels = region.width * region.height
      for (const frame of frames) {
        const patch = extractRectPatch(frame.data, width, region)
        let opaquePixels = 0
        for (let offset = 3; offset < patch.length; offset += 4) {
          if (patch[offset] === 255) opaquePixels += 1
        }
        regionResult.opaquePixelsByFrame.push({
          frame: frame.asset.id,
          opaquePixels,
          pixels: regionPixels,
        })
      }
      regionResult.allOpaque = regionResult.opaquePixelsByFrame.every(
        ({ opaquePixels, pixels }) => opaquePixels === pixels,
      )
      if (region.requireOpaque && !regionResult.allOpaque) {
        emit(
          'errors',
          'LOCKED_REGION_NOT_OPAQUE',
          `Locked region "${region.id}" is not fully opaque in every frame`,
          {
            lockedRegion: region.id,
            opaquePixelsByFrame: regionResult.opaquePixelsByFrame,
          },
        )
      }
    }
  }

  if (animation.allowedMotionMask && result.sameSize) {
    const maskAsset = assetsById.get(animation.allowedMotionMask.asset)
    const threshold = animation.allowedMotionMask.threshold ?? 1
    try {
      const maskFile = resolveInside(assetRoot, maskAsset.file)
      const mask = await readPng(maskFile)
      result.allowedMotionMask = {
        asset: maskAsset.id,
        threshold,
        size: { width: mask.info.width, height: mask.info.height },
        frameDiffs: [],
      }
      if (mask.info.width !== width || mask.info.height !== height) {
        emit(
          'errors',
          'MOTION_MASK_SIZE',
          `Motion mask is ${mask.info.width}x${mask.info.height}; expected ${width}x${height}`,
        )
      } else {
        if (anchor.excludeFromMotionMask) {
          let motionMaskPixels = 0
          for (
            let y = anchor.y - anchor.lockRadius;
            y <= anchor.y + anchor.lockRadius;
            y += 1
          ) {
            for (
              let x = anchor.x - anchor.lockRadius;
              x <= anchor.x + anchor.lockRadius;
              x += 1
            ) {
              if (mask.data[(y * width + x) * 4 + 3] >= threshold) {
                motionMaskPixels += 1
              }
            }
          }
          result.rootAnchor.motionMaskPixels = motionMaskPixels
          result.rootAnchor.excludedFromMotionMask = motionMaskPixels === 0
          if (motionMaskPixels > 0) {
            emit(
              'errors',
              'ROOT_ANCHOR_INSIDE_MOTION_MASK',
              `Root anchor patch overlaps ${motionMaskPixels} allowed-motion pixels`,
            )
          }
        }
        for (const regionResult of result.lockedRegions) {
          if (!regionResult.excludeFromMotionMask || !regionResult.inBounds) {
            continue
          }
          let motionMaskPixels = 0
          for (
            let y = regionResult.y;
            y < regionResult.y + regionResult.height;
            y += 1
          ) {
            for (
              let x = regionResult.x;
              x < regionResult.x + regionResult.width;
              x += 1
            ) {
              if (mask.data[(y * width + x) * 4 + 3] >= threshold) {
                motionMaskPixels += 1
              }
            }
          }
          regionResult.motionMaskPixels = motionMaskPixels
          regionResult.excludedFromMotionMask = motionMaskPixels === 0
          if (motionMaskPixels > 0) {
            emit(
              'errors',
              'LOCKED_REGION_INSIDE_MOTION_MASK',
              `Locked region "${regionResult.id}" overlaps ${motionMaskPixels} allowed-motion pixels`,
              { lockedRegion: regionResult.id },
            )
          }
        }
        for (const frame of frames.slice(1)) {
          const difference = inspectFrameDifference(
            first.data,
            frame.data,
            mask.data,
            threshold,
            width,
          )
          result.allowedMotionMask.frameDiffs.push({
            frame: frame.asset.id,
            ...difference,
          })
          if (difference.outsideMaskPixels > 0) {
            emit(
              'errors',
              'MOTION_OUTSIDE_MASK',
              `${difference.outsideMaskPixels} changed pixels in frame "${frame.asset.id}" are outside the allowed-motion mask`,
              { frame: frame.asset.id, examples: difference.examples },
            )
          }
        }
      }
    } catch (error) {
      emit(
        'errors',
        'MOTION_MASK_READ',
        `Could not read motion mask: ${error.message}`,
      )
    }
  }

  for (const assetId of animation.staticLayers ?? []) {
    const asset = assetsById.get(assetId)
    result.staticLayers = result.staticLayers.map((value) =>
      value === assetId
        ? {
            asset: assetId,
            expectedSha256: asset.sha256,
            verified:
              report.assets.find((entry) => entry.id === assetId)?.status ===
              'pass',
          }
        : value,
    )
  }

  result.status = result.errors.length === 0 ? 'pass' : 'fail'
  return result
}

const writeReport = async (report, reportPath) => {
  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
}

export const verifyManifest = async ({
  manifestPath,
  reportPath,
  schemaOnly = false,
  writeJsonReport = true,
}) => {
  const absoluteManifestPath = path.resolve(manifestPath)
  const manifestDirectory = path.dirname(absoluteManifestPath)
  const startedAt = new Date().toISOString()
  let manifest

  try {
    manifest = JSON.parse(await readFile(absoluteManifestPath, 'utf8'))
  } catch (error) {
    const report = {
      schemaVersion: SCHEMA_VERSION,
      mode: schemaOnly ? 'schema-only' : 'verify',
      manifest: absoluteManifestPath,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'fail',
      summary: { assets: 0, animations: 0, errors: 1, warnings: 0 },
      assets: [],
      animations: [],
      errors: [
        issue('MANIFEST_READ', `Could not read manifest: ${error.message}`),
      ],
      warnings: [],
    }
    return report
  }

  const shape = validateManifestShape(manifest)
  const resolvedAssetRoot =
    typeof manifest.assetRoot === 'string'
      ? path.resolve(manifestDirectory, manifest.assetRoot)
      : null
  const report = {
    schemaVersion: SCHEMA_VERSION,
    mode: schemaOnly ? 'schema-only' : 'verify',
    manifest: absoluteManifestPath,
    assetRoot: resolvedAssetRoot,
    startedAt,
    finishedAt: null,
    status: shape.errors.length === 0 ? 'pass' : 'fail',
    summary: {
      assets: manifest.assets?.length ?? 0,
      animations: manifest.animations?.length ?? 0,
      paletteFamilies: manifest.paletteFamilies?.length ?? 0,
      passedAssets: 0,
      passedAnimations: 0,
      passedPaletteFamilies: 0,
      errors: shape.errors.length,
      warnings: shape.warnings.length,
    },
    assets: [],
    animations: [],
    paletteFamilies: [],
    errors: [...shape.errors],
    warnings: [...shape.warnings],
  }

  const defaultReportPath = manifest.reportPath
    ? path.resolve(manifestDirectory, manifest.reportPath)
    : path.join(manifestDirectory, 'verification-report.json')
  const resolvedReportPath = reportPath
    ? path.resolve(reportPath)
    : defaultReportPath

  if (shape.errors.length === 0 && !schemaOnly) {
    for (const asset of manifest.assets) {
      report.assets.push(
        await validateAsset({
          asset,
          assetRoot: resolvedAssetRoot,
          defaults: manifest.defaults,
          report,
        }),
      )
    }

    for (const family of manifest.paletteFamilies ?? []) {
      report.paletteFamilies.push(validatePaletteFamily({ family, report }))
    }

    const assetsById = new Map(
      manifest.assets.map((asset) => [asset.id, asset]),
    )
    for (const animation of manifest.animations ?? []) {
      report.animations.push(
        await validateAnimation({
          animation,
          assetsById,
          assetRoot: resolvedAssetRoot,
          report,
        }),
      )
    }
  }

  report.summary.passedAssets = report.assets.filter(
    (asset) => asset.status === 'pass',
  ).length
  report.summary.passedAnimations = report.animations.filter(
    (animation) => animation.status === 'pass',
  ).length
  report.summary.passedPaletteFamilies = report.paletteFamilies.filter(
    (family) => family.status === 'pass',
  ).length
  report.summary.errors = report.errors.length
  report.summary.warnings = report.warnings.length
  report.status = report.errors.length === 0 ? 'pass' : 'fail'
  report.finishedAt = new Date().toISOString()

  if (writeJsonReport) {
    await writeReport(report, resolvedReportPath)
    report.reportPath = resolvedReportPath
  }
  return report
}

const help = `Bazaar3 deterministic PNG validator

Usage:
  node scripts/bazaar3/verify-assets.mjs --manifest <file> [options]

Options:
  --report <file>   Override the JSON report path.
  --schema-only     Validate manifest structure and references, but do not read PNGs.
  --no-report       Do not write a JSON report.
  --help            Show this message.
`

const parseArguments = (values) => {
  const parsed = {
    manifestPath: null,
    reportPath: null,
    schemaOnly: false,
    writeJsonReport: true,
  }
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--manifest') parsed.manifestPath = values[++index]
    else if (value === '--report') parsed.reportPath = values[++index]
    else if (value === '--schema-only') parsed.schemaOnly = true
    else if (value === '--no-report') parsed.writeJsonReport = false
    else if (value === '--help') parsed.help = true
    else throw new Error(`Unknown argument: ${value}`)
  }
  return parsed
}

const runCli = async () => {
  let options
  try {
    options = parseArguments(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    console.error(help)
    process.exitCode = 2
    return
  }
  if (options.help) {
    console.log(help)
    return
  }
  if (!options.manifestPath) {
    console.error('--manifest is required')
    console.error(help)
    process.exitCode = 2
    return
  }

  const report = await verifyManifest(options)
  const summary =
    `${report.status.toUpperCase()}: ${report.summary.passedAssets}/${report.summary.assets} assets, ` +
    `${report.summary.passedAnimations}/${report.summary.animations} animations, ` +
    `${report.summary.errors} errors, ${report.summary.warnings} warnings`
  if (report.status === 'pass') console.log(summary)
  else console.error(summary)
  if (report.reportPath) console.log(`Report: ${report.reportPath}`)
  process.exitCode = report.status === 'pass' ? 0 : 1
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) await runCli()
