import { drawBulb, P } from './pixel-canvas.mjs'

const drawPlasticBin = (canvas, x, y, width, height, body, lip) => {
  canvas.outlineRect(x, y, width, height, body, P.n0)
  canvas.rect(x + 2, y + 2, width - 4, 2, lip)
  canvas.rect(x + 3, y + height - 4, width - 6, 2, P.b0)
}

const drawCartridge = (canvas, x, y, color) => {
  canvas.outlineRect(x, y, 4, 5, color, P.n0)
  canvas.rect(x + 1, y + 1, 2, 1, P.c2)
}

const drawArcade = (canvas) => {
  canvas.polygon(
    [
      [179, 99],
      [197, 99],
      [201, 105],
      [200, 153],
      [177, 153],
      [177, 111],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [181, 101],
      [196, 101],
      [199, 106],
      [198, 151],
      [179, 151],
      [179, 112],
    ],
    P.b1,
  )

  canvas.polygon(
    [
      [182, 102],
      [195, 102],
      [197, 106],
      [181, 106],
    ],
    P.b3,
  )
  canvas.rect(183, 104, 10, 1, P.a3)

  canvas.outlineRect(181, 109, 16, 18, P.b3, P.n0)
  canvas.rect(184, 112, 10, 12, P.b4)
  canvas.rect(184, 112, 10, 2, P.b5)

  canvas.polygon(
    [
      [180, 129],
      [198, 129],
      [198, 137],
      [180, 137],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [182, 130],
      [196, 130],
      [196, 135],
      [182, 135],
    ],
    P.b2,
  )
  canvas.line(185, 131, 185, 128, P.n0, 2)
  canvas.rect(184, 127, 3, 3, P.r3)
  canvas.rect(190, 131, 2, 2, P.a3)
  canvas.rect(194, 131, 2, 2, P.r3)

  canvas.rect(181, 138, 16, 12, P.b0)
  canvas.rect(183, 140, 12, 8, P.b1)
  canvas.outlineRect(185, 143, 5, 4, P.n3, P.n0)
  canvas.set(188, 144, P.r3)
}

const drawStockShelves = (canvas) => {
  canvas.outlineRect(231, 99, 21, 48, P.n2, P.n0)
  canvas.rect(233, 101, 17, 44, P.w0)
  canvas.rect(233, 111, 17, 3, P.w3)
  canvas.rect(233, 126, 17, 3, P.w3)
  canvas.rect(233, 141, 17, 3, P.w3)

  canvas.outlineRect(235, 104, 6, 6, P.c1, P.n0)
  canvas.rect(236, 105, 4, 2, P.r3)
  canvas.outlineRect(243, 104, 5, 6, P.n4, P.n0)
  canvas.rect(244, 105, 3, 2, P.b3)

  canvas.outlineRect(234, 116, 8, 7, P.n4, P.n0)
  canvas.rect(236, 117, 4, 2, P.b3)
  canvas.outlineRect(243, 117, 6, 7, P.c1, P.n0)
  canvas.rect(244, 118, 4, 2, P.r3)

  drawCartridge(canvas, 235, 132, P.r2)
  drawCartridge(canvas, 241, 132, P.b2)
  drawCartridge(canvas, 247, 132, P.c1)
}

const drawSister = (canvas) => {
  canvas.outlinedEllipse(202, 113, 4, 5, P.w2, P.n0)
  canvas.outlinedEllipse(209, 114, 7, 8, P.w3, P.n0)
  canvas.outlinedEllipse(210, 116, 5, 6, P.s4, P.n0)
  canvas.polygon(
    [
      [204, 109],
      [213, 107],
      [216, 113],
      [211, 111],
      [208, 115],
      [204, 113],
    ],
    P.w2,
  )
  canvas.set(208, 116, P.n0)
  canvas.set(212, 116, P.n0)

  canvas.polygon(
    [
      [204, 122],
      [215, 122],
      [221, 133],
      [218, 148],
      [202, 148],
      [198, 134],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [205, 124],
      [214, 124],
      [219, 134],
      [216, 146],
      [204, 146],
      [200, 134],
    ],
    P.b2,
  )
  canvas.rect(205, 125, 9, 2, P.b3)
  canvas.line(209, 126, 209, 132, P.c3)

  canvas.line(201, 130, 207, 137, P.n0, 4)
  canvas.line(201, 130, 207, 137, P.b2, 2)
  canvas.line(217, 130, 215, 137, P.n0, 4)
  canvas.line(217, 130, 215, 137, P.b2, 2)
  canvas.rect(207, 135, 3, 3, P.s4)
  canvas.rect(213, 135, 3, 3, P.s4)

  canvas.rect(204, 146, 14, 6, P.n1)
  canvas.outlineRect(205, 151, 5, 8, P.s3, P.n0)
  canvas.outlineRect(213, 151, 5, 8, P.s3, P.n0)
  canvas.outlineRect(203, 157, 8, 3, P.c3, P.n0)
  canvas.outlineRect(212, 157, 8, 3, P.c3, P.n0)
  canvas.rect(204, 157, 6, 1, P.b3)
  canvas.rect(213, 157, 6, 1, P.b3)
}

const drawBrother = (canvas) => {
  canvas.outlinedEllipse(228, 121, 6, 7, P.n1, P.n0)
  canvas.outlinedEllipse(228, 123, 5, 6, P.s4, P.n0)
  canvas.polygon(
    [
      [222, 117],
      [226, 114],
      [232, 116],
      [234, 121],
      [230, 119],
      [227, 121],
      [222, 120],
    ],
    P.n1,
  )
  canvas.set(226, 123, P.n0)
  canvas.set(230, 123, P.n0)

  canvas.polygon(
    [
      [222, 129],
      [232, 129],
      [236, 137],
      [234, 148],
      [221, 148],
      [218, 137],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [223, 131],
      [231, 131],
      [234, 137],
      [232, 146],
      [222, 146],
      [220, 137],
    ],
    P.c3,
  )
  canvas.rect(221, 134, 13, 3, P.r2)
  canvas.rect(221, 141, 12, 3, P.r2)

  canvas.line(221, 133, 217, 137, P.n0, 4)
  canvas.line(221, 133, 217, 137, P.s3, 2)
  canvas.rect(216, 135, 3, 3, P.s4)
  canvas.line(233, 134, 235, 140, P.n0, 4)
  canvas.line(233, 134, 235, 140, P.s3, 2)

  canvas.rect(222, 146, 12, 6, P.b2)
  canvas.outlineRect(222, 151, 5, 8, P.s3, P.n0)
  canvas.outlineRect(230, 151, 5, 8, P.s3, P.n0)
  canvas.outlineRect(220, 157, 8, 3, P.c3, P.n0)
  canvas.outlineRect(229, 157, 8, 3, P.c3, P.n0)
  canvas.rect(221, 157, 6, 1, P.r3)
  canvas.rect(230, 157, 6, 1, P.r3)
}

const drawSharedHandheld = (canvas) => {
  canvas.outlineRect(209, 134, 11, 6, P.n3, P.n0)
  canvas.rect(212, 135, 5, 3, P.b0)
  canvas.set(213, 136, P.b4)
  canvas.set(218, 136, P.r3)
  canvas.set(210, 136, P.n7)
}

export const drawGames = (canvas) => {
  // Crooked, open kid-built frame and its own handmade sign.
  canvas.rect(165, 68, 6, 88, P.n0)
  canvas.rect(167, 69, 2, 85, P.w3)
  canvas.rect(169, 70, 1, 83, P.w4)
  canvas.polygon(
    [
      [168, 67],
      [218, 65],
      [220, 80],
      [170, 82],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [170, 68],
      [216, 67],
      [218, 78],
      [171, 80],
    ],
    P.w4,
  )
  canvas.text(175, 70, 'g', P.r2)
  canvas.text(180, 70, 'a', P.b3)
  canvas.text(185, 70, 'm', P.w1)
  canvas.text(190, 70, 'e', P.r2)
  canvas.text(195, 70, 's', P.b3)
  canvas.rect(171, 79, 45, 1, P.w2)

  canvas.line(170, 82, 184, 88, P.n0, 2)
  canvas.line(184, 88, 202, 84, P.n0, 2)
  canvas.line(202, 84, 218, 82, P.n0, 2)
  drawBulb(canvas, 179, 87)
  drawBulb(canvas, 191, 87)
  drawBulb(canvas, 207, 83)

  // Open rear bay: one crossbar and an uneven plank back, never a retail shell.
  canvas.rect(176, 91, 77, 5, P.n0)
  canvas.rect(178, 93, 73, 2, P.w3)
  canvas.outlineRect(176, 95, 77, 60, P.w0, P.n0)
  canvas.rect(178, 97, 73, 56, P.w1)
  canvas.rect(190, 97, 2, 56, P.w0)
  canvas.rect(217, 97, 2, 56, P.w0)
  canvas.rect(246, 97, 2, 56, P.w0)

  drawArcade(canvas)
  drawStockShelves(canvas)

  // One functional power junction and a short, legible feed into the arcade.
  canvas.outlineRect(168, 119, 8, 10, P.n4, P.n0)
  canvas.rect(170, 121, 4, 4, P.n2)
  canvas.set(171, 122, P.a3)
  canvas.set(173, 122, P.b4)
  canvas.line(176, 124, 178, 124, P.n0, 2)
  canvas.line(171, 129, 171, 153, P.n0, 2)

  // Shared stall floor, aligned to the building's y=155 wall-floor rail.
  canvas.polygon(
    [
      [166, 151],
      [252, 151],
      [254, 156],
      [164, 156],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [168, 152],
      [251, 152],
      [252, 154],
      [166, 154],
    ],
    P.w4,
  )
  canvas.rect(164, 156, 90, 8, P.n0)
  canvas.rect(166, 157, 86, 5, P.w2)
  canvas.rect(166, 157, 86, 1, P.w3)

  // Cheap wedges and brackets visibly hold the improvised structure together.
  canvas.polygon(
    [
      [165, 151],
      [176, 151],
      [165, 163],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [167, 153],
      [172, 153],
      [167, 159],
    ],
    P.w3,
  )
  canvas.line(244, 153, 252, 161, P.n0, 3)
  canvas.line(245, 153, 252, 160, P.w3)

  // Stock bins stay at the flanks and retain the items this stall sells.
  drawPlasticBin(canvas, 162, 142, 16, 22, P.b1, P.b3)
  drawCartridge(canvas, 164, 137, P.r2)
  drawCartridge(canvas, 169, 138, P.c1)
  drawCartridge(canvas, 173, 137, P.b2)

  drawPlasticBin(canvas, 241, 145, 14, 19, P.r1, P.r3)
  drawCartridge(canvas, 243, 141, P.b2)
  drawCartridge(canvas, 248, 140, P.c1)

  // Exactly two grounded siblings share exactly one handheld in a quiet idle.
  drawSister(canvas)
  drawBrother(canvas)
  drawSharedHandheld(canvas)
}
