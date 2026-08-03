const CELL_SIZE = 12
const GAUSSIAN_KERNEL = [1, 4, 6, 4, 1] as const
const GAUSSIAN_WEIGHT = 16

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const amount = clamp((value - edge0) / (edge1 - edge0))
  return amount * amount * (3 - 2 * amount)
}

const luminance = (red: number, green: number, blue: number) =>
  red * 0.2126 + green * 0.7152 + blue * 0.0722

function noise(x: number, y: number, seed: number) {
  let value =
    Math.imul(x + 1, 374_761_393) ^
    Math.imul(y + 1, 668_265_263) ^
    Math.imul(seed, 1_443_054_029)
  value = Math.imul(value ^ (value >>> 13), 1_274_126_177)
  value ^= value >>> 16
  return (value >>> 0) / 4_294_967_295
}

function buildHalationMap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const gridWidth = Math.ceil(width / CELL_SIZE)
  const gridHeight = Math.ceil(height / CELL_SIZE)
  const highlights = new Float32Array(gridWidth * gridHeight)
  const counts = new Uint16Array(gridWidth * gridHeight)

  for (let y = 0; y < height; y++) {
    const gridY = Math.floor(y / CELL_SIZE)
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const gridIndex = gridY * gridWidth + Math.floor(x / CELL_SIZE)
      const light = luminance(
        data[pixelIndex] / 255,
        data[pixelIndex + 1] / 255,
        data[pixelIndex + 2] / 255,
      )
      highlights[gridIndex] += smoothstep(0.72, 0.98, light)
      counts[gridIndex] += 1
    }
  }

  for (let index = 0; index < highlights.length; index++) {
    highlights[index] /= counts[index] || 1
  }

  const horizontal = new Float32Array(highlights.length)
  const blurred = new Float32Array(highlights.length)

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      let sum = 0
      for (let tap = -2; tap <= 2; tap++) {
        const sampleX = clamp(x + tap, 0, gridWidth - 1)
        sum += highlights[y * gridWidth + sampleX] * GAUSSIAN_KERNEL[tap + 2]
      }
      horizontal[y * gridWidth + x] = sum / GAUSSIAN_WEIGHT
    }
  }

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      let sum = 0
      for (let tap = -2; tap <= 2; tap++) {
        const sampleY = clamp(y + tap, 0, gridHeight - 1)
        sum += horizontal[sampleY * gridWidth + x] * GAUSSIAN_KERNEL[tap + 2]
      }
      blurred[y * gridWidth + x] = sum / GAUSSIAN_WEIGHT
    }
  }

  return { data: blurred, height: gridHeight, width: gridWidth }
}

function sampleHalation(
  map: ReturnType<typeof buildHalationMap>,
  x: number,
  y: number,
) {
  const gridX = clamp(x / CELL_SIZE - 0.5, 0, map.width - 1)
  const gridY = clamp(y / CELL_SIZE - 0.5, 0, map.height - 1)
  const x0 = Math.floor(gridX)
  const y0 = Math.floor(gridY)
  const x1 = Math.min(x0 + 1, map.width - 1)
  const y1 = Math.min(y0 + 1, map.height - 1)
  const tx = gridX - x0
  const ty = gridY - y0
  const top =
    map.data[y0 * map.width + x0] * (1 - tx) +
    map.data[y0 * map.width + x1] * tx
  const bottom =
    map.data[y1 * map.width + x0] * (1 - tx) +
    map.data[y1 * map.width + x1] * tx
  return top * (1 - ty) + bottom * ty
}

/**
 * Develops an RGBA frame in place. The restrained grade approximates a mild
 * sepia/contrast/saturation/brightness stack, then adds instant-film-specific
 * shadow, highlight, grain, halation, and lens-falloff characteristics.
 */
export function developInstantFilm(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seed: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    data.length < width * height * 4
  ) {
    throw new RangeError('Instant-film frame dimensions are invalid')
  }

  const halationMap = buildHalationMap(data, width, height)

  for (let y = 0; y < height; y++) {
    const normalizedY = ((y + 0.5) / height) * 2 - 1
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const sourceRed = data[index] / 255
      const sourceGreen = data[index + 1] / 255
      const sourceBlue = data[index + 2] / 255
      const sourceLight = luminance(sourceRed, sourceGreen, sourceBlue)

      const sepiaRed =
        sourceRed * 0.393 + sourceGreen * 0.769 + sourceBlue * 0.189
      const sepiaGreen =
        sourceRed * 0.349 + sourceGreen * 0.686 + sourceBlue * 0.168
      const sepiaBlue =
        sourceRed * 0.272 + sourceGreen * 0.534 + sourceBlue * 0.131

      let red = sourceRed + (sepiaRed - sourceRed) * 0.18
      let green = sourceGreen + (sepiaGreen - sourceGreen) * 0.18
      let blue = sourceBlue + (sepiaBlue - sourceBlue) * 0.18

      red = (red - 0.5) * 0.92 + 0.5
      green = (green - 0.5) * 0.92 + 0.5
      blue = (blue - 0.5) * 0.92 + 0.5

      const gradedLight = luminance(red, green, blue)
      red = gradedLight + (red - gradedLight) * 1.07
      green = gradedLight + (green - gradedLight) * 1.07
      blue = gradedLight + (blue - gradedLight) * 1.07

      red *= 1.035
      green *= 1.035
      blue *= 1.035

      const shadow = 1 - smoothstep(0.06, 0.52, sourceLight)
      const blackLift = shadow * 0.018
      red += blackLift * 0.8 - shadow * 0.004
      green += blackLift * 0.96 + shadow * 0.003
      blue += blackLift * 1.08 + shadow * 0.009

      const highlight = smoothstep(0.55, 0.96, sourceLight)
      red += highlight * 0.018
      green += highlight * 0.008
      blue -= highlight * 0.007

      const halo = sampleHalation(halationMap, x, y) * (1 - highlight * 0.72)
      red += halo * 0.018
      green += halo * 0.006
      blue -= halo * 0.002

      const normalizedX = ((x + 0.5) / width) * 2 - 1
      const radiusSquared =
        (normalizedX * normalizedX + normalizedY * normalizedY) / 2
      const vignette = 1 - smoothstep(0.22, 1, radiusSquared) * 0.07
      red *= vignette
      green *= vignette
      blue *= vignette

      const grain =
        (noise(x, y, seed) + noise(x, y, seed ^ 0x6d2b_79f5) - 1) *
        0.0105 *
        (0.78 + shadow * 0.22)

      data[index] = clamp(red + grain) * 255
      data[index + 1] = clamp(green + grain) * 255
      data[index + 2] = clamp(blue + grain) * 255
    }
  }
}

export function developInstantFilmCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
) {
  const image = context.getImageData(0, 0, width, height)
  developInstantFilm(image.data, width, height, seed)
  context.putImageData(image, 0, 0)
}
