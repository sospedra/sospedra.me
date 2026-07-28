import { drawBulb, drawCrate, drawLeafCluster, P } from './pixel-canvas.mjs'

const drawOutlinedLine = (canvas, x0, y0, x1, y1, body, outlineWidth = 3) => {
  canvas.line(x0, y0, x1, y1, P.n0, outlineWidth)
  canvas.line(x0, y0, x1, y1, body)
}

const drawPot = (canvas, x, y, width = 7, height = 7) => {
  canvas.outlineRect(x, y, width, 3, P.w4, P.n0)
  canvas.polygon(
    [
      [x + 1, y + 3],
      [x + width - 2, y + 3],
      [x + width - 3, y + height],
      [x + 2, y + height],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [x + 2, y + 3],
      [x + width - 3, y + 3],
      [x + width - 4, y + height - 1],
      [x + 3, y + height - 1],
    ],
    P.w3,
  )
}

const drawShelf = (canvas, x, y, width) => {
  canvas.rect(x, y, width, 3, P.n0)
  canvas.rect(x + 1, y, width - 2, 1, P.w4)
  canvas.rect(x + 2, y + 1, width - 3, 1, P.w2)
}

const drawPost = (canvas, x, top, height) => {
  canvas.outlineRect(x, top, 6, height, P.n3, P.n0)
  canvas.rect(x + 2, top + 1, 1, height - 2, P.n5)
  canvas.rect(x + 4, top + 6, 1, 10, P.w3)
  canvas.rect(x + 1, top + 29, 4, 2, P.n0)
  canvas.set(x + 2, top + 30, P.n7)
  canvas.rect(x + 4, top + 67, 1, 13, P.w2)
  canvas.rect(x + 1, top + 94, 4, 2, P.n0)
  canvas.set(x + 3, top + 95, P.n7)
}

const drawStringLights = (canvas) => {
  const points = [
    [39, 39],
    [49, 42],
    [59, 44],
    [69, 46],
    [79, 47],
    [90, 48],
    [101, 48],
    [112, 47],
    [123, 45],
    [134, 42],
    [143, 38],
  ]

  for (let index = 0; index < points.length - 1; index += 1) {
    canvas.line(
      points[index][0],
      points[index][1],
      points[index + 1][0],
      points[index + 1][1],
      P.n0,
    )
  }

  for (const [index, point] of points.slice(0, -1).entries()) {
    drawBulb(canvas, point[0] + 5, point[1] + 6 + (index % 2))
  }
}

const drawProjectsSign = (canvas) => {
  canvas.line(66, 45, 68, 58, P.n0)
  canvas.line(111, 45, 109, 59, P.n0)
  canvas.line(67, 46, 69, 58, P.c1)
  canvas.line(110, 46, 108, 59, P.c1)

  canvas.polygon(
    [
      [63, 57],
      [113, 59],
      [112, 72],
      [62, 70],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [65, 59],
      [111, 60],
      [110, 70],
      [64, 68],
    ],
    P.w3,
  )
  canvas.rect(67, 60, 41, 1, P.w4)
  canvas.set(66, 67, P.w1)
  canvas.set(108, 68, P.w1)
  canvas.text(71, 62, 'projects', P.c4)
}

const drawIndigoDozer = (canvas) => {
  drawShelf(canvas, 116, 56, 28)

  const limbs = [
    [122, 47, 115, 43],
    [121, 50, 114, 50],
    [123, 53, 117, 58],
    [138, 47, 145, 43],
    [139, 50, 146, 51],
    [138, 53, 143, 58],
  ]
  for (const [x0, y0, x1, y1] of limbs) {
    drawOutlinedLine(canvas, x0, y0, x1, y1, P.p3)
  }

  canvas.outlinedEllipse(130, 49, 11, 7, P.p2, P.n0)
  canvas.ellipse(126, 45, 5, 3, P.p3)
  canvas.rect(122, 43, 7, 2, P.g2)
  canvas.set(125, 42, P.g4)

  for (const y of [45, 49, 53]) {
    canvas.rect(133, y - 1, 3, 3, P.n0)
    canvas.set(134, y, P.a4)
  }

  drawOutlinedLine(canvas, 139, 46, 145, 39, P.p3)
  canvas.rect(144, 36, 3, 3, P.k2)
  canvas.set(145, 37, P.k4)
}

const drawLowerAlien = (canvas) => {
  const legs = [
    [52, 151, 49, 159],
    [56, 153, 55, 161],
    [61, 153, 62, 161],
    [65, 151, 68, 159],
  ]
  for (const [x0, y0, x1, y1] of legs) {
    drawOutlinedLine(canvas, x0, y0, x1, y1, P.p3)
  }

  canvas.polygon(
    [
      [50, 144],
      [52, 137],
      [56, 144],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [55, 143],
      [58, 135],
      [61, 143],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [60, 144],
      [64, 138],
      [66, 145],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [52, 143],
      [53, 139],
      [55, 144],
    ],
    P.p4,
  )
  canvas.polygon(
    [
      [57, 142],
      [58, 138],
      [60, 143],
    ],
    P.p4,
  )
  canvas.polygon(
    [
      [62, 143],
      [64, 140],
      [65, 145],
    ],
    P.p4,
  )

  drawOutlinedLine(canvas, 53, 144, 48, 138, P.p4)
  drawOutlinedLine(canvas, 62, 143, 68, 138, P.p4)
  canvas.set(47, 137, P.k4)
  canvas.set(69, 137, P.k4)

  canvas.outlinedEllipse(58, 150, 10, 7, P.p2, P.n0)
  canvas.ellipse(58, 151, 5, 3, P.k3)
  canvas.rect(55, 150, 7, 2, P.k4)
  canvas.rect(51, 147, 3, 3, P.n0)
  canvas.set(52, 148, P.e0)
  canvas.rect(63, 147, 3, 3, P.n0)
  canvas.set(64, 148, P.e0)
}

const drawWateringGardener = (canvas) => {
  canvas.line(99, 80, 99, 84, P.n0)
  canvas.set(99, 79, P.a3)

  canvas.outlineRect(90, 84, 19, 11, P.n4, P.n0)
  canvas.rect(92, 86, 15, 2, P.n6)
  canvas.rect(94, 89, 4, 3, P.n0)
  canvas.set(96, 90, P.a4)
  canvas.rect(101, 89, 4, 3, P.n0)
  canvas.set(103, 90, P.a4)
  canvas.rect(97, 94, 5, 4, P.n0)
  canvas.rect(98, 95, 3, 3, P.n5)

  drawOutlinedLine(canvas, 93, 99, 89, 105, P.n5)
  drawOutlinedLine(canvas, 106, 99, 111, 105, P.n5)
  canvas.outlinedEllipse(90, 101, 3, 3, P.n4, P.n0)
  canvas.outlinedEllipse(108, 101, 3, 3, P.n4, P.n0)
  canvas.rect(88, 98, 5, 3, P.g2)
  canvas.set(89, 97, P.g4)
  canvas.rect(106, 98, 4, 3, P.g2)

  canvas.rect(95, 98, 9, 23, P.n0)
  canvas.rect(98, 99, 3, 20, P.n4)
  canvas.line(94, 104, 105, 104, P.n5)
  canvas.line(94, 111, 105, 111, P.n5)

  canvas.polygon(
    [
      [92, 101],
      [106, 101],
      [105, 123],
      [94, 123],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [94, 103],
      [104, 103],
      [103, 121],
      [95, 121],
    ],
    P.c1,
  )
  canvas.rect(96, 113, 7, 5, P.c0)
  canvas.line(94, 103, 103, 121, P.c2)

  drawOutlinedLine(canvas, 90, 103, 101, 112, P.n5)
  drawOutlinedLine(canvas, 101, 112, 116, 118, P.n5)
  drawOutlinedLine(canvas, 108, 103, 112, 112, P.n5)
  drawOutlinedLine(canvas, 112, 112, 118, 122, P.n5)
  for (const [x, y] of [
    [101, 112],
    [112, 112],
  ]) {
    canvas.outlinedEllipse(x, y, 3, 3, P.n4, P.n0)
  }

  canvas.rect(114, 116, 5, 3, P.n0)
  canvas.line(116, 118, 121, 120, P.n0)
  canvas.line(116, 119, 120, 123, P.n0)
  canvas.line(118, 116, 122, 117, P.n0)

  canvas.outlineRect(118, 115, 14, 12, P.n4, P.n0)
  canvas.rect(120, 117, 10, 8, P.n5)
  canvas.line(121, 116, 124, 112, P.n0)
  canvas.line(124, 112, 129, 116, P.n0)
  canvas.line(131, 120, 139, 126, P.n0, 3)
  canvas.line(132, 120, 139, 126, P.n6)
  canvas.rect(138, 125, 5, 3, P.n0)
  canvas.rect(139, 126, 3, 1, P.n6)

  drawOutlinedLine(canvas, 96, 121, 94, 138, P.n5)
  drawOutlinedLine(canvas, 94, 138, 92, 153, P.n5)
  drawOutlinedLine(canvas, 103, 121, 106, 138, P.n5)
  drawOutlinedLine(canvas, 106, 138, 109, 153, P.n5)
  canvas.outlinedEllipse(95, 138, 3, 3, P.n4, P.n0)
  canvas.outlinedEllipse(106, 138, 3, 3, P.n4, P.n0)
  canvas.line(88, 153, 96, 153, P.n0, 3)
  canvas.line(106, 153, 114, 153, P.n0, 3)
  canvas.line(89, 152, 95, 152, P.n6)
  canvas.line(107, 152, 113, 152, P.n6)

  for (const [x, y] of [
    [139, 130],
    [138, 133],
    [137, 136],
  ]) {
    canvas.set(x, y, P.e1)
  }
}

const drawSeedling = (canvas) => {
  drawPot(canvas, 132, 143, 9, 9)
  canvas.line(136, 143, 136, 135, P.g2)
  canvas.ellipse(133, 137, 3, 2, P.g4)
  canvas.ellipse(139, 136, 3, 2, P.g3)
  canvas.set(136, 134, P.g5)
}

const drawPlantShelves = (canvas) => {
  canvas.rect(40, 70, 33, 68, P.n1)
  canvas.rect(126, 66, 16, 73, P.n1)

  for (const y of [82, 104, 126]) drawShelf(canvas, 39, y, 36)
  for (const y of [76, 98, 120]) drawShelf(canvas, 125, y, 18)

  canvas.line(44, 69, 44, 137, P.n0, 3)
  canvas.line(71, 70, 71, 137, P.n0, 3)
  canvas.line(129, 63, 129, 139, P.n0, 3)
  canvas.line(140, 62, 140, 139, P.n0, 3)

  drawPot(canvas, 42, 75)
  drawLeafCluster(canvas, 46, 72, 5)
  drawPot(canvas, 58, 77)
  drawLeafCluster(canvas, 62, 73, 6)
  drawPot(canvas, 65, 97)
  drawLeafCluster(canvas, 68, 93, 5)
  drawPot(canvas, 43, 98)
  drawLeafCluster(canvas, 47, 94, 6)
  drawCrate(canvas, 54, 108, 16, 13, P.w2, P.w4)
  drawLeafCluster(canvas, 56, 104, 5)
  drawPot(canvas, 40, 120, 9, 8)
  drawLeafCluster(canvas, 44, 116, 6)

  drawPot(canvas, 127, 90, 8, 8)
  drawLeafCluster(canvas, 132, 86, 5)
  drawPot(canvas, 134, 111, 7, 8)
  drawLeafCluster(canvas, 137, 107, 5)
  drawLeafCluster(canvas, 130, 116, 5)

  canvas.line(72, 74, 78, 84, P.g2)
  canvas.line(77, 83, 73, 96, P.g2)
  canvas.set(75, 79, P.g4)
  canvas.set(76, 90, P.g4)
  canvas.line(126, 70, 121, 83, P.g2)
  canvas.line(121, 83, 124, 94, P.g2)
  canvas.set(122, 78, P.g4)
  canvas.set(123, 90, P.g4)
}

const drawRaggedCrown = (canvas) => {
  for (const [x, y, size] of [
    [38, 36, 5],
    [46, 31, 6],
    [55, 36, 7],
    [66, 32, 5],
    [75, 40, 6],
    [116, 38, 6],
    [124, 33, 7],
    [136, 35, 6],
    [144, 31, 4],
  ]) {
    drawLeafCluster(canvas, x, y, size)
  }
  canvas.line(39, 39, 42, 67, P.g2)
  canvas.line(143, 34, 139, 64, P.g2)
  canvas.set(41, 49, P.g4)
  canvas.set(140, 51, P.g4)
}

export const drawProjects = (canvas) => {
  canvas.rect(36, 68, 108, 87, P.n1)
  canvas.rect(76, 73, 48, 82, P.n0)
  canvas.rect(79, 76, 42, 77, P.n1)

  drawPost(canvas, 34, 34, 121)
  drawPost(canvas, 143, 30, 125)
  drawPlantShelves(canvas)
  drawRaggedCrown(canvas)
  drawStringLights(canvas)
  drawIndigoDozer(canvas)
  drawProjectsSign(canvas)

  canvas.rect(34, 154, 112, 5, P.n0)
  canvas.rect(36, 154, 108, 2, P.n3)
  canvas.rect(41, 159, 99, 2, P.n1)
  drawCrate(canvas, 35, 147, 14, 14, P.w2, P.w4)
  drawLeafCluster(canvas, 38, 143, 5)
  drawLowerAlien(canvas)
  drawWateringGardener(canvas)
  drawSeedling(canvas)

  drawLeafCluster(canvas, 73, 150, 6)
  drawLeafCluster(canvas, 80, 157, 5)
  drawLeafCluster(canvas, 123, 151, 5)
  drawPot(canvas, 116, 151, 8, 9)
  canvas.line(117, 150, 114, 142, P.g2)
  canvas.set(114, 141, P.g4)
}
