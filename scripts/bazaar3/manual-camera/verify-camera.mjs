import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const TARGET = Object.freeze({ width: 960, height: 1264 })
const ANALYSIS = Object.freeze({ width: 480, height: 632 })
const ASPECT = TARGET.width / TARGET.height

const ROIS = Object.freeze({
  counter: { x: 41, y: 368, width: 398, height: 165 },
  leftFrame: { x: 20, y: 41, width: 85, height: 500 },
  rightFrame: { x: 375, y: 41, width: 85, height: 500 },
  topArchitecture: { x: 27, y: 21, width: 426, height: 165 },
  rearArchitecture: { x: 56, y: 87, width: 368, height: 298 },
  floorTrench: { x: 21, y: 510, width: 438, height: 110 },
  robotExclusion: { x: 123, y: 152, width: 234, height: 234 },
})

const PERSPECTIVE_ROIS = Object.freeze({
  topBeam: { x: 15, y: 10, width: 450, height: 90 },
  outerLeftArchitecture: { x: 0, y: 35, width: 92, height: 480 },
  outerRightArchitecture: { x: 388, y: 35, width: 92, height: 480 },
  rearWallTopBorder: { x: 72, y: 78, width: 336, height: 92 },
  rearWallLeftBorder: { x: 52, y: 145, width: 90, height: 228 },
  rearWallRightBorder: { x: 338, y: 145, width: 90, height: 228 },
  counterTopBorder: { x: 38, y: 330, width: 404, height: 102 },
  counterLeftBorder: { x: 38, y: 350, width: 92, height: 176 },
  counterRightBorder: { x: 350, y: 350, width: 92, height: 176 },
  floorUpperBorder: { x: 20, y: 500, width: 440, height: 45 },
  trenchBorder: { x: 20, y: 548, width: 440, height: 45 },
  frontFloorBorder: { x: 20, y: 590, width: 440, height: 35 },
})

const THRESHOLDS = Object.freeze({
  exactDimensions: TARGET,
  aspectRelativeErrorPass: 0.01,
  aspectRelativeErrorWarn: 0.025,
  expectedAngleToleranceDegrees: 3.5,
  counterMinimumSpanPx: 200,
  counterMinimumHorizontalLines: 2,
  sideFrameMinimumVerticalSpanPx: 225,
  topMinimumHorizontalSpanPx: 235,
  floorMinimumHorizontalSpanPx: 260,
  perspectiveDiagonalMinimumSpanPx: 115,
  perspectiveDiagonalMinimumDegrees: 7,
  perspectiveDiagonalMaximumDegrees: 75,
  maximumLongPerspectiveDiagonals: 2,
  maximumConvergencePairs: 0,
})

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value))

const normalizeDirection = (degrees) => {
  let angle = degrees
  while (angle >= 90) angle -= 180
  while (angle < -90) angle += 180
  return angle
}

const horizontalDistance = (angle) => Math.abs(normalizeDirection(angle))

const verticalDistance = (angle) =>
  Math.abs(90 - Math.abs(normalizeDirection(angle)))

const pointInside = (x, y, roi) =>
  x >= roi.x && x < roi.x + roi.width && y >= roi.y && y < roi.y + roi.height

const pointInRobotExclusion = (x, y) => pointInside(x, y, ROIS.robotExclusion)

const parseArguments = () => {
  const args = process.argv.slice(2)
  const candidate = args.find((arg) => !arg.startsWith('--'))
  const outIndex = args.indexOf('--out-dir')
  const outDir = outIndex >= 0 ? args[outIndex + 1] : undefined
  const noFail = args.includes('--no-fail')

  if (!candidate) {
    console.error(
      'Usage: node scripts/bazaar3/manual-camera/verify-camera.mjs <candidate.png> [--out-dir <path>] [--no-fail]',
    )
    process.exit(2)
  }

  return { candidate: path.resolve(candidate), outDir, noFail }
}

const percentile = (values, ratio) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * ratio)]
}

const computeEdges = ({ data, width, height }) => {
  const gradient = new Uint16Array(width * height)
  const magnitudes = []

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const topLeft = data[index - width - 1]
      const top = data[index - width]
      const topRight = data[index - width + 1]
      const left = data[index - 1]
      const right = data[index + 1]
      const bottomLeft = data[index + width - 1]
      const bottom = data[index + width]
      const bottomRight = data[index + width + 1]

      const gx =
        -topLeft + topRight + -2 * left + 2 * right + -bottomLeft + bottomRight
      const gy =
        -topLeft + -2 * top + -topRight + bottomLeft + 2 * bottom + bottomRight
      const magnitude = Math.round(Math.hypot(gx, gy))
      gradient[index] = magnitude
      if (magnitude > 0) magnitudes.push(magnitude)
    }
  }

  const dynamicThreshold = clamp(percentile(magnitudes, 0.78), 76, 260)
  const points = []

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = y * width + x
      const magnitude = gradient[index]
      if (magnitude < dynamicThreshold) continue

      const isLocalMaximum =
        magnitude >= gradient[index - 1] &&
        magnitude >= gradient[index + 1] &&
        magnitude >= gradient[index - width] &&
        magnitude >= gradient[index + width]
      if (!isLocalMaximum) continue

      points.push({ x, y, magnitude })
    }
  }

  const maximumPoints = 22_000
  if (points.length <= maximumPoints) {
    return { points, threshold: dynamicThreshold, sourceCount: points.length }
  }

  const stride = points.length / maximumPoints
  const sampled = []
  for (let index = 0; index < maximumPoints; index += 1) {
    sampled.push(points[Math.floor(index * stride)])
  }

  return {
    points: sampled,
    threshold: dynamicThreshold,
    sourceCount: points.length,
  }
}

const houghLines = (allPoints, roi, options = {}) => {
  const {
    angleMinimum = -89,
    angleMaximum = 90,
    minimumVotes = 18,
    minimumSpan = 42,
    minimumCoverage = 0.28,
    maximumProjectionGap = 4.25,
    maximumLines = 30,
    roiName,
  } = options
  const points = allPoints.filter((point) => pointInside(point.x, point.y, roi))
  if (points.length === 0) return []

  const diagonal = Math.ceil(Math.hypot(ANALYSIS.width, ANALYSIS.height))
  const rhoOffset = diagonal
  const rhoBins = diagonal * 2 + 1
  const candidates = []

  for (
    let direction = angleMinimum;
    direction <= angleMaximum;
    direction += 1
  ) {
    const radians = (direction * Math.PI) / 180
    const dx = Math.cos(radians)
    const dy = Math.sin(radians)
    const nx = -dy
    const ny = dx
    const accumulator = new Uint16Array(rhoBins)

    for (const point of points) {
      const rho = Math.round(point.x * nx + point.y * ny) + rhoOffset
      if (rho >= 0 && rho < rhoBins) accumulator[rho] += 1
    }

    for (let rhoIndex = 1; rhoIndex < rhoBins - 1; rhoIndex += 1) {
      const votes = accumulator[rhoIndex]
      if (
        votes < minimumVotes ||
        votes < accumulator[rhoIndex - 1] ||
        votes < accumulator[rhoIndex + 1]
      ) {
        continue
      }

      const rho = rhoIndex - rhoOffset
      const members = []
      for (const point of points) {
        const distance = Math.abs(point.x * nx + point.y * ny - rho)
        if (distance <= 1.25) {
          members.push({
            point,
            projection: point.x * dx + point.y * dy,
          })
        }
      }
      if (members.length < minimumVotes) continue

      members.sort((a, b) => a.projection - b.projection)
      const clusters = []
      let cluster = [members[0]]
      for (let index = 1; index < members.length; index += 1) {
        const current = members[index]
        const previous = members[index - 1]
        if (current.projection - previous.projection <= maximumProjectionGap) {
          cluster.push(current)
        } else {
          clusters.push(cluster)
          cluster = [current]
        }
      }
      clusters.push(cluster)
      clusters.sort((firstCluster, secondCluster) => {
        const firstSpan =
          firstCluster.at(-1).projection - firstCluster[0].projection
        const secondSpan =
          secondCluster.at(-1).projection - secondCluster[0].projection
        return (
          secondSpan +
          secondCluster.length * 0.25 -
          (firstSpan + firstCluster.length * 0.25)
        )
      })

      const strongestCluster = clusters[0]
      const first = strongestCluster[0]
      const last = strongestCluster.at(-1)
      const span = last.projection - first.projection
      const coverage = strongestCluster.length / Math.max(1, span)
      if (
        span < minimumSpan ||
        strongestCluster.length < minimumVotes ||
        coverage < minimumCoverage
      ) {
        continue
      }

      candidates.push({
        angle: normalizeDirection(direction),
        rho,
        votes: strongestCluster.length,
        span,
        coverage,
        x1: first.point.x,
        y1: first.point.y,
        x2: last.point.x,
        y2: last.point.y,
        roi:
          roiName ??
          Object.keys(ROIS).find((key) => ROIS[key] === roi) ??
          'unknown',
        detector: 'hough',
      })
    }
  }

  candidates.sort((a, b) => b.span + b.votes * 0.8 - (a.span + a.votes * 0.8))
  const selected = []

  for (const candidate of candidates) {
    const duplicate = selected.some(
      (line) =>
        Math.abs(line.angle - candidate.angle) <= 2 &&
        Math.abs(line.rho - candidate.rho) <= 5,
    )
    if (!duplicate) selected.push(candidate)
    if (selected.length >= maximumLines) break
  }

  return selected
}

const segmentedAxisLines = (allPoints, roi, orientation, options = {}) => {
  const {
    bandRadius = 2,
    maximumGap = 24,
    minimumCoverage = 0.1,
    minimumVotes = 22,
    minimumSpan = 80,
    maximumLines = 12,
    roiName = 'unknown',
  } = options
  const points = allPoints.filter((point) => pointInside(point.x, point.y, roi))
  const axisStart = orientation === 'horizontal' ? roi.y : roi.x
  const axisEnd =
    axisStart + (orientation === 'horizontal' ? roi.height : roi.width)
  const candidates = []

  for (let center = axisStart; center < axisEnd; center += 1) {
    const coordinates = new Set()
    for (const point of points) {
      const axisValue = orientation === 'horizontal' ? point.y : point.x
      if (Math.abs(axisValue - center) <= bandRadius) {
        coordinates.add(
          Math.round(orientation === 'horizontal' ? point.x : point.y),
        )
      }
    }
    if (coordinates.size < minimumVotes) continue

    const ordered = [...coordinates].sort((first, second) => first - second)
    const clusters = []
    let cluster = [ordered[0]]
    for (let index = 1; index < ordered.length; index += 1) {
      const coordinate = ordered[index]
      if (coordinate - ordered[index - 1] <= maximumGap) {
        cluster.push(coordinate)
      } else {
        clusters.push(cluster)
        cluster = [coordinate]
      }
    }
    clusters.push(cluster)
    clusters.sort((first, second) => {
      const firstSpan = first.at(-1) - first[0]
      const secondSpan = second.at(-1) - second[0]
      return secondSpan + second.length * 0.4 - (firstSpan + first.length * 0.4)
    })

    const strongest = clusters[0]
    const first = strongest[0]
    const last = strongest.at(-1)
    const span = last - first
    const coverage = strongest.length / Math.max(1, span + 1)
    if (
      span < minimumSpan ||
      strongest.length < minimumVotes ||
      coverage < minimumCoverage
    ) {
      continue
    }

    candidates.push({
      angle: orientation === 'horizontal' ? 0 : -90,
      rho: center,
      votes: strongest.length,
      span,
      coverage,
      x1: orientation === 'horizontal' ? first : center,
      y1: orientation === 'horizontal' ? center : first,
      x2: orientation === 'horizontal' ? last : center,
      y2: orientation === 'horizontal' ? center : last,
      roi: roiName,
      detector: 'segmented-axis-density',
      maximumGap,
      bandRadius,
    })
  }

  candidates.sort(
    (first, second) =>
      second.span + second.votes * 0.5 - (first.span + first.votes * 0.5),
  )
  const selected = []
  for (const candidate of candidates) {
    const duplicate = selected.some((line) => {
      const firstAxis = orientation === 'horizontal' ? line.y1 : line.x1
      const secondAxis =
        orientation === 'horizontal' ? candidate.y1 : candidate.x1
      return Math.abs(firstAxis - secondAxis) <= bandRadius * 2 + 2
    })
    if (!duplicate) selected.push(candidate)
    if (selected.length >= maximumLines) break
  }

  return selected
}

const lineIntersection = (first, second) => {
  const denominator =
    (first.x1 - first.x2) * (second.y1 - second.y2) -
    (first.y1 - first.y2) * (second.x1 - second.x2)
  if (Math.abs(denominator) < 0.001) return null

  const determinantA = first.x1 * first.y2 - first.y1 * first.x2
  const determinantB = second.x1 * second.y2 - second.y1 * second.x2
  return {
    x:
      (determinantA * (second.x1 - second.x2) -
        (first.x1 - first.x2) * determinantB) /
      denominator,
    y:
      (determinantA * (second.y1 - second.y2) -
        (first.y1 - first.y2) * determinantB) /
      denominator,
  }
}

const uniqueLines = (lines) => {
  const selected = []
  const ordered = [...lines].sort((a, b) => b.span - a.span)
  for (const candidate of ordered) {
    const duplicate = selected.some(
      (line) =>
        Math.abs(line.angle - candidate.angle) <= 2.5 &&
        Math.hypot(
          (line.x1 + line.x2) / 2 - (candidate.x1 + candidate.x2) / 2,
          (line.y1 + line.y2) / 2 - (candidate.y1 + candidate.y2) / 2,
        ) < 18,
    )
    if (!duplicate) selected.push(candidate)
  }
  return selected
}

const grade = (passed, warning = false) =>
  passed ? 'pass' : warning ? 'warn' : 'fail'

const toFixed = (value, digits = 2) => Number(value.toFixed(digits))

const xmlEscape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const main = async () => {
  const { candidate, outDir: providedOutDir, noFail } = parseArguments()
  const metadata = await sharp(candidate).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read candidate dimensions: ${candidate}`)
  }

  const basename = path.basename(candidate, path.extname(candidate))
  const outputDir = providedOutDir
    ? path.resolve(providedOutDir)
    : path.join(
        process.cwd(),
        'scripts/bazaar3/manual-camera/reports',
        basename,
      )
  await mkdir(outputDir, { recursive: true })

  const normalizedPath = path.join(outputDir, 'analysis-normalized.png')
  const normalizedBuffer = await sharp(candidate)
    .resize({
      width: ANALYSIS.width,
      height: ANALYSIS.height,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer()
  await writeFile(normalizedPath, normalizedBuffer)

  const grayscale = await sharp(normalizedBuffer)
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const edges = computeEdges({
    data: grayscale.data,
    width: ANALYSIS.width,
    height: ANALYSIS.height,
  })

  const linesByRoi = {
    counter: uniqueLines([
      ...houghLines(edges.points, ROIS.counter, {
        minimumVotes: 25,
        minimumSpan: 70,
        maximumLines: 35,
      }),
      ...segmentedAxisLines(edges.points, ROIS.counter, 'horizontal', {
        minimumSpan: 165,
        minimumVotes: 26,
        minimumCoverage: 0.1,
        maximumGap: 26,
        roiName: 'counter',
      }),
    ]),
    leftFrame: uniqueLines([
      ...houghLines(edges.points, ROIS.leftFrame, {
        minimumVotes: 22,
        minimumSpan: 90,
        maximumLines: 24,
      }),
      ...segmentedAxisLines(edges.points, ROIS.leftFrame, 'vertical', {
        minimumSpan: 190,
        minimumVotes: 28,
        minimumCoverage: 0.1,
        maximumGap: 28,
        roiName: 'leftFrame',
      }),
    ]),
    rightFrame: uniqueLines([
      ...houghLines(edges.points, ROIS.rightFrame, {
        minimumVotes: 22,
        minimumSpan: 90,
        maximumLines: 24,
      }),
      ...segmentedAxisLines(edges.points, ROIS.rightFrame, 'vertical', {
        minimumSpan: 190,
        minimumVotes: 28,
        minimumCoverage: 0.1,
        maximumGap: 28,
        roiName: 'rightFrame',
      }),
    ]),
    topArchitecture: uniqueLines([
      ...houghLines(edges.points, ROIS.topArchitecture, {
        minimumVotes: 24,
        minimumSpan: 90,
        maximumLines: 30,
      }),
      ...segmentedAxisLines(edges.points, ROIS.topArchitecture, 'horizontal', {
        minimumSpan: 190,
        minimumVotes: 28,
        minimumCoverage: 0.1,
        maximumGap: 30,
        roiName: 'topArchitecture',
      }),
    ]),
    rearArchitecture: houghLines(
      edges.points.filter((point) => !pointInRobotExclusion(point.x, point.y)),
      ROIS.rearArchitecture,
      {
        minimumVotes: 22,
        minimumSpan: 80,
        maximumLines: 35,
      },
    ),
    floorTrench: uniqueLines([
      ...houghLines(edges.points, ROIS.floorTrench, {
        minimumVotes: 24,
        minimumSpan: 80,
        maximumLines: 35,
      }),
      ...segmentedAxisLines(edges.points, ROIS.floorTrench, 'horizontal', {
        minimumSpan: 210,
        minimumVotes: 30,
        minimumCoverage: 0.1,
        maximumGap: 34,
        roiName: 'floorTrench',
      }),
    ]),
  }

  const perspectivePoints = edges.points.filter(
    (point) => !pointInRobotExclusion(point.x, point.y),
  )
  const perspectiveSearchLines = uniqueLines(
    Object.entries(PERSPECTIVE_ROIS).flatMap(([roiName, region]) =>
      houghLines(perspectivePoints, region, {
        angleMinimum: -75,
        angleMaximum: 75,
        minimumVotes: 12,
        minimumSpan: 72,
        minimumCoverage: 0.12,
        maximumProjectionGap: 9,
        maximumLines: 24,
        roiName,
      }),
    ),
  )

  const expectedTolerance = THRESHOLDS.expectedAngleToleranceDegrees
  const counterHorizontals = linesByRoi.counter.filter(
    (line) =>
      horizontalDistance(line.angle) <= expectedTolerance &&
      line.span >= THRESHOLDS.counterMinimumSpanPx,
  )
  const leftVerticals = linesByRoi.leftFrame.filter(
    (line) =>
      verticalDistance(line.angle) <= expectedTolerance &&
      line.span >= THRESHOLDS.sideFrameMinimumVerticalSpanPx,
  )
  const rightVerticals = linesByRoi.rightFrame.filter(
    (line) =>
      verticalDistance(line.angle) <= expectedTolerance &&
      line.span >= THRESHOLDS.sideFrameMinimumVerticalSpanPx,
  )
  const topHorizontals = linesByRoi.topArchitecture.filter(
    (line) =>
      horizontalDistance(line.angle) <= expectedTolerance &&
      line.span >= THRESHOLDS.topMinimumHorizontalSpanPx,
  )
  const floorHorizontals = linesByRoi.floorTrench.filter(
    (line) =>
      horizontalDistance(line.angle) <= expectedTolerance &&
      line.span >= THRESHOLDS.floorMinimumHorizontalSpanPx,
  )

  const longPerspectiveDiagonals = perspectiveSearchLines.filter((line) => {
    const angle = horizontalDistance(line.angle)
    return (
      angle >= THRESHOLDS.perspectiveDiagonalMinimumDegrees &&
      angle <= THRESHOLDS.perspectiveDiagonalMaximumDegrees &&
      line.span >= THRESHOLDS.perspectiveDiagonalMinimumSpanPx
    )
  })

  const convergencePairs = []
  for (
    let firstIndex = 0;
    firstIndex < longPerspectiveDiagonals.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < longPerspectiveDiagonals.length;
      secondIndex += 1
    ) {
      const first = longPerspectiveDiagonals[firstIndex]
      const second = longPerspectiveDiagonals[secondIndex]
      if (Math.sign(first.angle) === Math.sign(second.angle)) continue
      if (Math.abs(first.angle - second.angle) < 14) continue

      const intersection = lineIntersection(first, second)
      if (
        intersection &&
        intersection.x >= -ANALYSIS.width * 0.5 &&
        intersection.x <= ANALYSIS.width * 1.5 &&
        intersection.y >= -ANALYSIS.height * 0.65 &&
        intersection.y <= ANALYSIS.height * 1.2
      ) {
        convergencePairs.push({ first, second, intersection })
      }
    }
  }

  const inputAspect = metadata.width / metadata.height
  const aspectRelativeError = Math.abs(inputAspect - ASPECT) / ASPECT
  const dimensionsExact =
    metadata.width === TARGET.width && metadata.height === TARGET.height

  const checks = [
    {
      id: 'dimensions',
      status: dimensionsExact ? 'pass' : 'fail',
      measured: `${metadata.width}×${metadata.height}`,
      expected: `${TARGET.width}×${TARGET.height}`,
      note: 'Production delivery must be exact. The verifier resized a copy only for analysis; it never modified the candidate.',
    },
    {
      id: 'aspect-ratio',
      status: grade(
        aspectRelativeError <= THRESHOLDS.aspectRelativeErrorPass,
        aspectRelativeError <= THRESHOLDS.aspectRelativeErrorWarn,
      ),
      measured: toFixed(inputAspect, 5),
      expected: toFixed(ASPECT, 5),
      note: `${toFixed(aspectRelativeError * 100, 2)}% relative error`,
    },
    {
      id: 'counter-horizontal-family',
      status: grade(
        counterHorizontals.length >= THRESHOLDS.counterMinimumHorizontalLines,
      ),
      measured: `${counterHorizontals.length} qualifying long horizontal lines`,
      expected: `≥ ${THRESHOLDS.counterMinimumHorizontalLines}, each ≥ ${THRESHOLDS.counterMinimumSpanPx}px on the 480×632 analysis copy`,
      note: 'The counter needs multiple parallel horizontal edges: front/back of the shallow top band and/or front-face boundaries.',
    },
    {
      id: 'left-frame-vertical',
      status: grade(leftVerticals.length >= 1),
      measured: `${leftVerticals.length} qualifying vertical uprights`,
      expected: `≥ 1 line with span ≥ ${THRESHOLDS.sideFrameMinimumVerticalSpanPx}px`,
      note: 'The left bay frame must read as a vertical elevation.',
    },
    {
      id: 'right-frame-vertical',
      status: grade(rightVerticals.length >= 1),
      measured: `${rightVerticals.length} qualifying vertical uprights`,
      expected: `≥ 1 line with span ≥ ${THRESHOLDS.sideFrameMinimumVerticalSpanPx}px`,
      note: 'The right bay frame must read as a vertical elevation.',
    },
    {
      id: 'top-horizontal-family',
      status: grade(topHorizontals.length >= 1),
      measured: `${topHorizontals.length} qualifying long horizontals`,
      expected: `≥ 1 line with span ≥ ${THRESHOLDS.topMinimumHorizontalSpanPx}px`,
      note: 'The overhead beam and rear bands must stay front-facing.',
    },
    {
      id: 'floor-trench-horizontal-family',
      status: grade(floorHorizontals.length >= 1),
      measured: `${floorHorizontals.length} qualifying long horizontals`,
      expected: `≥ 1 line with span ≥ ${THRESHOLDS.floorMinimumHorizontalSpanPx}px`,
      note: 'The floor is a shallow stack of horizontal bands, not a deep perspective plane.',
    },
    {
      id: 'long-perspective-diagonals',
      status: grade(
        longPerspectiveDiagonals.length <=
          THRESHOLDS.maximumLongPerspectiveDiagonals,
      ),
      measured: `${longPerspectiveDiagonals.length} suspicious long diagonals`,
      expected: `≤ ${THRESHOLDS.maximumLongPerspectiveDiagonals}`,
      note: 'This ignores the central robot zone, but may still flag legitimate long tools/cables. Review every red line.',
    },
    {
      id: 'convergence',
      status: grade(
        convergencePairs.length <= THRESHOLDS.maximumConvergencePairs,
      ),
      measured: `${convergencePairs.length} plausible opposite-slope convergence pairs`,
      expected: `${THRESHOLDS.maximumConvergencePairs}`,
      note: 'A pair is evidence, not proof, of a vanishing point. Architecture must still be reviewed visually.',
    },
  ]

  const cameraChecks = checks.filter(
    (check) => !['dimensions', 'aspect-ratio'].includes(check.id),
  )
  const cameraStatus = cameraChecks.some((check) => check.status === 'fail')
    ? 'fail'
    : cameraChecks.some((check) => check.status === 'warn')
      ? 'warn'
      : 'pass'
  const deliveryStatus = checks.some((check) => check.status === 'fail')
    ? 'fail'
    : checks.some((check) => check.status === 'warn')
      ? 'warn'
      : 'pass'

  const displayLines = uniqueLines([
    ...counterHorizontals,
    ...leftVerticals,
    ...rightVerticals,
    ...topHorizontals,
    ...floorHorizontals,
    ...longPerspectiveDiagonals,
  ])

  const isSuspicious = (line) =>
    longPerspectiveDiagonals.some(
      (candidate) =>
        Math.abs(candidate.angle - line.angle) <= 1 &&
        Math.hypot(candidate.x1 - line.x1, candidate.y1 - line.y1) < 6,
    )

  const scale = 2
  const roiSvg = Object.entries(ROIS)
    .filter(([name]) => name !== 'robotExclusion')
    .map(
      ([name, region]) =>
        `<rect x="${region.x * scale}" y="${region.y * scale}" width="${region.width * scale}" height="${region.height * scale}" fill="none" stroke="#55d6ff" stroke-width="2" stroke-dasharray="9 8" opacity=".55"/><text x="${region.x * scale + 5}" y="${region.y * scale + 18}" fill="#55d6ff" font-family="monospace" font-size="15">${xmlEscape(name)}</text>`,
    )
    .join('')
  const lineSvg = displayLines
    .map((line) => {
      const suspicious = isSuspicious(line)
      const color = suspicious ? '#ff394f' : '#49f39a'
      return `<line x1="${line.x1 * scale}" y1="${line.y1 * scale}" x2="${line.x2 * scale}" y2="${line.y2 * scale}" stroke="${color}" stroke-width="${suspicious ? 5 : 4}" opacity=".9"/><text x="${((line.x1 + line.x2) / 2) * scale}" y="${((line.y1 + line.y2) / 2) * scale - 5}" fill="${color}" font-family="monospace" font-size="14">${toFixed(line.angle, 0)}°</text>`
    })
    .join('')
  const intersectionSvg = convergencePairs
    .map(
      ({ intersection }) =>
        `<circle cx="${intersection.x * scale}" cy="${intersection.y * scale}" r="12" fill="none" stroke="#ffd166" stroke-width="5"/><line x1="${intersection.x * scale - 18}" y1="${intersection.y * scale}" x2="${intersection.x * scale + 18}" y2="${intersection.y * scale}" stroke="#ffd166" stroke-width="3"/><line x1="${intersection.x * scale}" y1="${intersection.y * scale - 18}" x2="${intersection.x * scale}" y2="${intersection.y * scale + 18}" stroke="#ffd166" stroke-width="3"/>`,
    )
    .join('')
  const overlaySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${TARGET.width}" height="${TARGET.height}">
      ${roiSvg}
      ${lineSvg}
      ${intersectionSvg}
      <rect x="0" y="0" width="960" height="60" fill="#06090d" fill-opacity=".88"/>
      <text x="18" y="26" fill="${cameraStatus === 'pass' ? '#49f39a' : '#ff596a'}" font-family="monospace" font-size="21" font-weight="700">CAMERA ${cameraStatus.toUpperCase()} • DELIVERY ${deliveryStatus.toUpperCase()}</text>
      <text x="18" y="49" fill="#f5ead4" font-family="monospace" font-size="15">green = expected 0°/90° family • red = suspicious long diagonal • yellow = convergence candidate</text>
    </svg>
  `

  const overlayPath = path.join(outputDir, 'camera-audit-overlay.png')
  await sharp(normalizedBuffer)
    .resize(TARGET.width, TARGET.height, {
      kernel: sharp.kernel.nearest,
    })
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png()
    .toFile(overlayPath)

  const report = {
    schemaVersion: 1,
    candidate,
    generatedAt: new Date().toISOString(),
    target: TARGET,
    source: {
      width: metadata.width,
      height: metadata.height,
      aspect: toFixed(inputAspect, 6),
      exactDimensions: dimensionsExact,
    },
    analysis: {
      normalizedCopy: {
        width: ANALYSIS.width,
        height: ANALYSIS.height,
        method:
          'A private Lanczos analysis copy was resized to the canonical aspect. The source candidate was not modified.',
        caveat:
          'When the candidate aspect differs materially, this normalization can alter measured angles; the aspect check therefore fails first.',
      },
      sobelEdgeThreshold: edges.threshold,
      unsampledEdgePoints: edges.sourceCount,
      analyzedEdgePoints: edges.points.length,
      regions: ROIS,
      perspectiveRegions: PERSPECTIVE_ROIS,
      thresholds: THRESHOLDS,
    },
    statuses: {
      camera: cameraStatus,
      delivery: deliveryStatus,
    },
    checks,
    evidence: {
      counterHorizontals,
      leftVerticals,
      rightVerticals,
      topHorizontals,
      floorHorizontals,
      longPerspectiveDiagonals,
      convergencePairs,
      detectedLinesByRoi: linesByRoi,
    },
    limitations: [
      'This is a conservative machine-aided camera audit, not an art approval.',
      'Hough evidence detects high-contrast straight edges; painterly, broken, or low-contrast lines can evade it. Segmented axis-density evidence supplements interrupted horizontal and vertical pixel-art edges.',
      'Perspective detection is restricted to outer architecture, rear-wall borders, counter top/outer borders, and floor/trench borders. It intentionally excludes the robot and counter-front inventory.',
      'Long tools, cables, arms, and sign ropes inside an architectural border can still create false-positive diagonals. Every red line needs inspection.',
      'The audit cannot prove the robot is floating behind the counter, only whether counter/frame/floor line families support the intended camera.',
      'It cannot evaluate identity, exact arm/eye count, palette quality, lighting integration, pixel-grid fidelity, or animation registration.',
      'Visual review against Uses and the generated layout guide is mandatory even on PASS.',
    ],
    outputs: {
      normalizedAnalysisCopy: normalizedPath,
      annotatedOverlay: overlayPath,
    },
  }

  const jsonPath = path.join(outputDir, 'camera-audit.json')
  const markdownPath = path.join(outputDir, 'camera-audit.md')
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`)

  const checkRows = checks
    .map(
      (check) =>
        `| ${check.id} | ${check.status.toUpperCase()} | ${check.measured} | ${check.expected} | ${check.note} |`,
    )
    .join('\n')
  const markdown = `# Manual camera audit

- Candidate: \`${candidate}\`
- Camera status: **${cameraStatus.toUpperCase()}**
- Production delivery status: **${deliveryStatus.toUpperCase()}**
- Source: ${metadata.width}×${metadata.height}
- Analysis copy: ${ANALYSIS.width}×${ANALYSIS.height}; source untouched

| Check | Status | Measured | Expected | Interpretation |
| --- | --- | --- | --- | --- |
${checkRows}

## Evidence

- Counter horizontals: ${counterHorizontals.length}
- Left vertical uprights: ${leftVerticals.length}
- Right vertical uprights: ${rightVerticals.length}
- Top architectural horizontals: ${topHorizontals.length}
- Floor/trench horizontals: ${floorHorizontals.length}
- Suspicious long diagonals: ${longPerspectiveDiagonals.length}
- Plausible convergence pairs: ${convergencePairs.length}

## Limitations

${report.limitations.map((limitation) => `- ${limitation}`).join('\n')}

## Outputs

- Annotated overlay: \`${overlayPath}\`
- JSON evidence: \`${jsonPath}\`
- Normalized analysis copy: \`${normalizedPath}\`
`
  await writeFile(markdownPath, markdown)

  console.log(`camera=${cameraStatus} delivery=${deliveryStatus}`)
  console.log(path.relative(process.cwd(), markdownPath))
  console.log(path.relative(process.cwd(), overlayPath))

  if (!noFail && deliveryStatus === 'fail') process.exitCode = 1
}

await main()
