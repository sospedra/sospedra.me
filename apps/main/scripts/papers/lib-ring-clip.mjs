const isInside = ([x, y], edge, box) => {
  const [x0, y0, x1, y1] = box
  if (edge === 0) return x >= x0
  if (edge === 1) return x <= x1
  if (edge === 2) return y >= y0
  return y <= y1
}

const crossing = (from, to, edge, box) => {
  const [x0, y0, x1, y1] = box
  const [ax, ay] = from
  const [bx, by] = to
  if (edge < 2) {
    const cut = edge === 0 ? x0 : x1
    return [cut, ay + ((by - ay) * (cut - ax)) / (bx - ax)]
  }
  const cut = edge === 2 ? y0 : y1
  return [ax + ((bx - ax) * (cut - ay)) / (by - ay), cut]
}

const clipToEdge = (ring, edge, box) => {
  const output = []
  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i]
    const previous = ring[(i + ring.length - 1) % ring.length]
    const currentIn = isInside(current, edge, box)
    if (currentIn !== isInside(previous, edge, box)) {
      output.push(crossing(previous, current, edge, box))
    }
    if (currentIn) output.push(current)
  }
  return output
}

/** Sutherland-Hodgman against a lon/lat box. */
export const clipRing = (ring, box) => {
  let output = ring
  for (let edge = 0; edge < 4 && output.length > 0; edge += 1) {
    output = clipToEdge(output, edge, box)
  }
  return output
}

export const intersectsBox = (ring, box) => {
  const [x0, y0, x1, y1] = box
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return maxX >= x0 && minX <= x1 && maxY >= y0 && minY <= y1
}
