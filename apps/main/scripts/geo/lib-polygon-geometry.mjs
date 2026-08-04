export const signedArea = (ring) => {
  let area = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[index + 1]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

const pointSegmentDistanceSquared = (point, start, end) => {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
  }
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        (dx * dx + dy * dy),
    ),
  )
  const x = start[0] + ratio * dx
  const y = start[1] + ratio * dy
  return (point[0] - x) ** 2 + (point[1] - y) ** 2
}

const simplifyOpenLine = (points, tolerance) => {
  if (points.length <= 2) return points
  const threshold = tolerance ** 2
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop()
    let furthestIndex = -1
    let furthestDistance = threshold
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = pointSegmentDistanceSquared(
        points[index],
        points[startIndex],
        points[endIndex],
      )
      if (distance > furthestDistance) {
        furthestDistance = distance
        furthestIndex = index
      }
    }
    if (furthestIndex < 0) continue
    keep[furthestIndex] = 1
    stack.push([startIndex, furthestIndex], [furthestIndex, endIndex])
  }

  return points.filter((_, index) => keep[index] === 1)
}

export const simplifyRing = (ring, tolerance) => {
  if (ring.length <= 5) return ring
  const open = ring.slice(0, -1)
  const anchor = open.reduce(
    (best, point, index) => (point[0] < open[best][0] ? index : best),
    0,
  )
  const rotated = [...open.slice(anchor), ...open.slice(0, anchor)]
  rotated.push(rotated[0])
  const simplified = simplifyOpenLine(rotated, tolerance)
  if (simplified.length < 4) return ring
  simplified[simplified.length - 1] = simplified[0]
  return simplified
}

export const polygonsOf = (geometry) => {
  if (geometry?.type === 'Polygon') return [geometry.coordinates]
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates
  return []
}

export const filteredPolygons = (feature, minimumAreaRatio) => {
  const polygons = polygonsOf(feature.geometry)
  const totalArea = polygons.reduce(
    (sum, polygon) => sum + Math.abs(signedArea(polygon[0])),
    0,
  )
  return polygons.filter(
    (polygon) =>
      Math.abs(signedArea(polygon[0])) >= totalArea * minimumAreaRatio,
  )
}

export const boundsOf = (polygons) => {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        bounds.minX = Math.min(bounds.minX, longitude)
        bounds.maxX = Math.max(bounds.maxX, longitude)
        bounds.minY = Math.min(bounds.minY, latitude)
        bounds.maxY = Math.max(bounds.maxY, latitude)
      }
    }
  }
  return bounds
}

export const ringPath = (ring) => {
  if (ring.length < 4) return ''
  const [start, ...rest] = ring
  return `M${start[0]} ${start[1]}${rest
    .slice(0, -1)
    .map(([x, y]) => `L${x} ${y}`)
    .join('')}Z`
}

export const polygonPath = (polygon, project, tolerancePx) =>
  polygon
    .map((ring) => ringPath(simplifyRing(ring.map(project), tolerancePx)))
    .filter(Boolean)
    .join('')
