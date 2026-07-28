export const P = Object.freeze({
  n0: '#020307',
  n1: '#080c12',
  n2: '#111923',
  n3: '#1c2731',
  n4: '#2b3741',
  n5: '#414c55',
  n6: '#606970',
  n7: '#898e8d',
  c0: '#4b4236',
  c1: '#786852',
  c2: '#a38b69',
  c3: '#cfad7e',
  c4: '#edd09c',
  w0: '#1d100a',
  w1: '#321a0f',
  w2: '#4b2816',
  w3: '#6b391c',
  w4: '#925022',
  w5: '#bd7133',
  r0: '#361015',
  r1: '#5c171c',
  r2: '#882225',
  r3: '#b83932',
  r4: '#dd6048',
  p0: '#171221',
  p1: '#2a1e38',
  p2: '#443153',
  p3: '#674870',
  p4: '#966d94',
  b0: '#071421',
  b1: '#0a2942',
  b2: '#0d486d',
  b3: '#126e9b',
  b4: '#1f9cc8',
  b5: '#4bd2e1',
  t0: '#071c1d',
  t1: '#0e3534',
  t2: '#165652',
  t3: '#267c73',
  t4: '#56b4a4',
  g0: '#10180e',
  g1: '#1e2d14',
  g2: '#31461a',
  g3: '#4b6220',
  g4: '#6b7e2d',
  g5: '#95a247',
  k0: '#2e1723',
  k1: '#50283b',
  k2: '#784159',
  k3: '#a95f77',
  k4: '#d68b9a',
  a0: '#4a280d',
  a1: '#7b4514',
  a2: '#ad6a1e',
  a3: '#df9e32',
  a4: '#ffd26b',
  s0: '#2f1915',
  s1: '#542b22',
  s2: '#80442f',
  s3: '#ad6744',
  s4: '#d18d5a',
  s5: '#efbd82',
  e0: '#ffe3a1',
  e1: '#8be9e7',
})

const rgbCache = new Map()

const rgb = (hex) => {
  if (rgbCache.has(hex)) return rgbCache.get(hex)
  const value = hex.replace('#', '')
  const parsed = [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
  rgbCache.set(hex, parsed)
  return parsed
}

const FONT = Object.freeze({
  ' ': ['000', '000', '000', '000', '000'],
  '↑': ['010', '111', '010', '010', '010'],
  A: ['010', '101', '111', '101', '101'],
  C: ['111', '100', '100', '100', '111'],
  E: ['111', '100', '110', '100', '111'],
  G: ['111', '100', '101', '101', '111'],
  L: ['100', '100', '100', '100', '111'],
  P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  a: ['010', '101', '111', '101', '101'],
  c: ['111', '100', '100', '100', '111'],
  e: ['111', '100', '110', '100', '111'],
  g: ['111', '101', '111', '001', '111'],
  j: ['001', '001', '001', '101', '111'],
  l: ['100', '100', '100', '100', '111'],
  m: ['101', '111', '111', '101', '101'],
  o: ['111', '101', '101', '101', '111'],
  p: ['110', '101', '110', '100', '100'],
  r: ['110', '101', '100', '100', '100'],
  s: ['111', '100', '111', '001', '111'],
  t: ['111', '010', '010', '010', '010'],
  v: ['101', '101', '101', '101', '010'],
})

export class PixelCanvas {
  constructor(width, height, background = P.n0) {
    this.width = width
    this.height = height
    this.data = new Uint8Array(width * height * 4)
    this.rect(0, 0, width, height, background)
  }

  set(x, y, color) {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return
    const [r, g, b] = rgb(color)
    const offset = (py * this.width + px) * 4
    this.data[offset] = r
    this.data[offset + 1] = g
    this.data[offset + 2] = b
    this.data[offset + 3] = 255
  }

  rect(x, y, width, height, color) {
    const left = Math.max(0, Math.floor(x))
    const top = Math.max(0, Math.floor(y))
    const right = Math.min(this.width, Math.ceil(x + width))
    const bottom = Math.min(this.height, Math.ceil(y + height))
    const [r, g, b] = rgb(color)
    for (let py = top; py < bottom; py += 1) {
      for (let px = left; px < right; px += 1) {
        const offset = (py * this.width + px) * 4
        this.data[offset] = r
        this.data[offset + 1] = g
        this.data[offset + 2] = b
        this.data[offset + 3] = 255
      }
    }
  }

  outlineRect(x, y, width, height, fill, outline = P.n0, thickness = 1) {
    this.rect(x, y, width, height, outline)
    this.rect(
      x + thickness,
      y + thickness,
      Math.max(0, width - thickness * 2),
      Math.max(0, height - thickness * 2),
      fill,
    )
  }

  line(x0, y0, x1, y1, color, thickness = 1) {
    let x = Math.round(x0)
    let y = Math.round(y0)
    const endX = Math.round(x1)
    const endY = Math.round(y1)
    const dx = Math.abs(endX - x)
    const sx = x < endX ? 1 : -1
    const dy = -Math.abs(endY - y)
    const sy = y < endY ? 1 : -1
    let error = dx + dy
    const radius = Math.max(0, Math.floor((thickness - 1) / 2))
    while (true) {
      this.rect(x - radius, y - radius, thickness, thickness, color)
      if (x === endX && y === endY) break
      const twice = 2 * error
      if (twice >= dy) {
        error += dy
        x += sx
      }
      if (twice <= dx) {
        error += dx
        y += sy
      }
    }
  }

  polygon(points, color) {
    if (points.length < 3) return
    const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))))
    const maxY = Math.min(
      this.height - 1,
      Math.ceil(Math.max(...points.map(([, y]) => y))),
    )
    for (let y = minY; y <= maxY; y += 1) {
      const intersections = []
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index]
        const [x2, y2] = points[(index + 1) % points.length]
        if (y1 === y2) continue
        const lowY = Math.min(y1, y2)
        const highY = Math.max(y1, y2)
        if (y < lowY || y >= highY) continue
        intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
      }
      intersections.sort((a, b) => a - b)
      for (let index = 0; index + 1 < intersections.length; index += 2) {
        const start = Math.ceil(intersections[index])
        const end = Math.floor(intersections[index + 1])
        this.rect(start, y, end - start + 1, 1, color)
      }
    }
  }

  ellipse(cx, cy, radiusX, radiusY, color) {
    const minX = Math.floor(cx - radiusX)
    const maxX = Math.ceil(cx + radiusX)
    const minY = Math.floor(cy - radiusY)
    const maxY = Math.ceil(cy + radiusY)
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const nx = (x - cx) / radiusX
        const ny = (y - cy) / radiusY
        if (nx * nx + ny * ny <= 1) this.set(x, y, color)
      }
    }
  }

  outlinedEllipse(
    cx,
    cy,
    radiusX,
    radiusY,
    fill,
    outline = P.n0,
    thickness = 1,
  ) {
    this.ellipse(cx, cy, radiusX, radiusY, outline)
    this.ellipse(
      cx,
      cy,
      Math.max(1, radiusX - thickness),
      Math.max(1, radiusY - thickness),
      fill,
    )
  }

  text(x, y, value, color, scale = 1, spacing = 1) {
    let cursor = Math.round(x)
    for (const character of value) {
      const glyph = FONT[character] ?? FONT[character.toUpperCase()] ?? FONT[' ']
      for (let row = 0; row < glyph.length; row += 1) {
        for (let column = 0; column < glyph[row].length; column += 1) {
          if (glyph[row][column] === '1') {
            this.rect(
              cursor + column * scale,
              y + row * scale,
              scale,
              scale,
              color,
            )
          }
        }
      }
      cursor += 3 * scale + spacing
    }
  }
}

export const drawBulb = (canvas, x, y, wireColor = P.n0) => {
  canvas.line(x, y - 3, x, y - 1, wireColor)
  canvas.rect(x - 1, y - 1, 3, 3, P.a2)
  canvas.set(x, y, P.e0)
}

export const drawLeafCluster = (canvas, x, y, size = 5) => {
  canvas.outlinedEllipse(x, y, size, Math.max(2, size - 2), P.g2, P.n0)
  canvas.ellipse(x - Math.floor(size / 2), y + 1, Math.max(2, size - 2), 2, P.g3)
  canvas.ellipse(x + Math.floor(size / 2), y - 1, Math.max(2, size - 2), 2, P.g3)
  canvas.rect(x - 1, y - Math.max(1, size - 3), 2, 2, P.g4)
}

export const drawCrate = (canvas, x, y, width, height, body, highlight) => {
  canvas.outlineRect(x, y, width, height, body, P.n0)
  canvas.line(x + 2, y + 2, x + width - 3, y + 2, highlight)
  canvas.line(x + 2, y + height - 3, x + width - 3, y + 2, P.n0)
}

export const drawBolt = (canvas, x, y) => {
  canvas.set(x, y, P.n7)
}
