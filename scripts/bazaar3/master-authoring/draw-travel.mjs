import { drawBolt, drawCrate, P } from './pixel-canvas.mjs'

const BAY_LEFT = 268
const BAY_RIGHT = 384

const drawLantern = (canvas, x, y) => {
  canvas.line(x, y - 8, x, y - 3, P.n0)
  canvas.rect(x - 3, y - 4, 7, 2, P.w2)
  canvas.outlineRect(x - 4, y - 2, 9, 12, P.a0, P.n0)
  canvas.rect(x - 2, y, 5, 7, P.a2)
  canvas.rect(x - 1, y + 1, 3, 5, P.a4)
  canvas.set(x, y + 3, P.e0)
  canvas.rect(x - 3, y + 9, 7, 2, P.w3)
}

const drawRouteCard = (canvas, x, y, planetColor, routeSide) => {
  canvas.outlineRect(x, y, 9, 12, P.c1, P.n0)
  canvas.rect(x + 2, y + 2, 5, 7, P.c2)
  canvas.set(x + (routeSide === 'left' ? 3 : 5), y + 4, planetColor)
  canvas.set(x + 5, y + 7, P.p3)
  canvas.line(x + (routeSide === 'left' ? 3 : 5), y + 4, x + 5, y + 7, P.r2)
}

const drawHangingSuit = (canvas) => {
  canvas.line(358, 58, 358, 62, P.w4)
  canvas.outlinedEllipse(358, 67, 6, 5, P.n4, P.n0)
  canvas.rect(355, 66, 7, 3, P.b1)
  canvas.set(356, 66, P.b3)
  canvas.polygon(
    [
      [351, 73],
      [365, 73],
      [368, 81],
      [365, 101],
      [351, 101],
      [348, 81],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [353, 75],
      [363, 75],
      [365, 82],
      [363, 99],
      [353, 99],
      [351, 82],
    ],
    P.c1,
  )
  canvas.rect(353, 82, 12, 4, P.w3)
  canvas.line(352, 77, 347, 91, P.n0, 3)
  canvas.line(364, 77, 369, 91, P.n0, 3)
  canvas.line(352, 77, 347, 91, P.c1)
  canvas.line(364, 77, 369, 91, P.c1)
  canvas.rect(355, 86, 6, 2, P.n3)
  canvas.set(356, 87, P.a3)
  canvas.set(360, 87, P.b4)
}

const drawOrbitalModel = (canvas) => {
  canvas.rect(286, 123, 18, 3, P.w1)
  canvas.line(295, 113, 295, 123, P.w4)
  canvas.outlinedEllipse(295, 115, 3, 3, P.a2, P.n0)
  canvas.set(295, 115, P.e0)
  canvas.line(295, 115, 287, 118, P.w4)
  canvas.line(295, 115, 303, 110, P.w4)
  canvas.set(287, 118, P.p4)
  canvas.set(303, 110, P.b4)
}

const drawScope = (canvas) => {
  canvas.line(358, 118, 354, 126, P.w3)
  canvas.line(358, 118, 363, 126, P.w3)
  canvas.polygon(
    [
      [352, 114],
      [364, 111],
      [366, 115],
      [355, 119],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [355, 114],
      [363, 113],
      [364, 115],
      [356, 117],
    ],
    P.w4,
  )
  canvas.rect(364, 112, 3, 4, P.b3)
  canvas.set(366, 113, P.e1)
}

const drawHearthian = (canvas) => {
  // Implied height is 65 logical pixels, from head top y=84 to root y=149.
  // The counter later occludes the planted legs and pelvis.
  canvas.rect(324, 127, 7, 23, P.n2)
  canvas.rect(335, 127, 7, 23, P.n2)

  // Broad side ears and a compact, unmistakably four-eyed head.
  canvas.polygon(
    [
      [320, 88],
      [311, 85],
      [313, 95],
      [320, 101],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [319, 90],
      [313, 87],
      [315, 94],
      [321, 98],
    ],
    P.n5,
  )
  canvas.polygon(
    [
      [344, 88],
      [353, 85],
      [351, 95],
      [344, 101],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [345, 90],
      [351, 87],
      [349, 94],
      [343, 98],
    ],
    P.n5,
  )
  canvas.outlinedEllipse(332, 94, 14, 10, P.n5, P.n0)
  canvas.ellipse(327, 90, 7, 3, P.n6)

  const eyes = [
    [327, 92],
    [337, 92],
    [327, 98],
    [337, 98],
  ]
  for (const [x, y] of eyes) {
    canvas.outlinedEllipse(x, y, 2, 2, P.a4, P.n0)
    canvas.set(x, y, P.e0)
  }
  canvas.line(329, 102, 335, 102, P.n0)
  canvas.set(332, 103, P.n3)

  canvas.outlineRect(328, 103, 8, 7, P.n4, P.n0)

  // Scarf and practical flight jacket.
  canvas.polygon(
    [
      [320, 106],
      [344, 106],
      [347, 114],
      [345, 134],
      [319, 134],
      [317, 114],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [321, 109],
      [343, 109],
      [345, 115],
      [343, 133],
      [321, 133],
      [319, 115],
    ],
    P.w3,
  )
  canvas.rect(320, 106, 24, 5, P.r3)
  canvas.rect(322, 111, 5, 21, P.w1)
  canvas.rect(337, 111, 5, 21, P.w4)
  canvas.line(332, 111, 332, 133, P.n0)
  canvas.polygon(
    [
      [324, 111],
      [331, 117],
      [328, 123],
    ],
    P.c2,
  )
  canvas.polygon(
    [
      [340, 111],
      [333, 117],
      [336, 123],
    ],
    P.c2,
  )
  canvas.rect(336, 123, 5, 4, P.n2)
  drawBolt(canvas, 338, 125)

  // Exactly two arms: ticket arm on the left, counter hand on the right.
  canvas.line(320, 113, 313, 120, P.n0, 5)
  canvas.line(313, 120, 311, 125, P.n0, 5)
  canvas.line(320, 113, 313, 120, P.w3, 3)
  canvas.line(313, 120, 311, 125, P.w3, 3)
  canvas.outlinedEllipse(310, 123, 3, 3, P.n5, P.n0)
  canvas.outlineRect(306, 114, 5, 9, P.c3, P.n0)
  canvas.line(308, 116, 309, 120, P.r2)

  canvas.line(344, 113, 350, 120, P.n0, 5)
  canvas.line(350, 120, 348, 128, P.n0, 5)
  canvas.line(344, 113, 350, 120, P.w3, 3)
  canvas.line(350, 120, 348, 128, P.w3, 3)
  canvas.outlinedEllipse(348, 128, 4, 2, P.n5, P.n0)
}

const drawCounter = (canvas) => {
  // A shallow 0.2-ish top band and a dominant straight front face.
  canvas.outlineRect(277, 126, 101, 7, P.w4, P.n0)
  canvas.rect(280, 128, 95, 3, P.c2)
  canvas.outlineRect(278, 132, 99, 27, P.w2, P.n0)
  canvas.rect(280, 134, 48, 22, P.w3)
  canvas.rect(329, 134, 46, 22, P.n3)
  canvas.line(328, 133, 328, 157, P.n0)
  canvas.line(282, 139, 325, 139, P.w4)
  canvas.rect(337, 139, 27, 13, P.n2)
  canvas.polygon(
    [
      [346, 141],
      [355, 141],
      [359, 146],
      [355, 151],
      [346, 151],
      [342, 146],
    ],
    P.w3,
  )
  canvas.set(350, 146, P.a3)
  canvas.rect(280, 156, 95, 3, P.n1)
  for (const x of [284, 323, 333, 370]) drawBolt(canvas, x, 153)

  // Reassert the planted hand above the counter lip.
  canvas.outlinedEllipse(348, 128, 4, 2, P.n5, P.n0)
}

const drawLuggage = (canvas) => {
  drawCrate(canvas, 270, 148, 15, 17, P.w3, P.w4)
  canvas.rect(274, 145, 7, 4, P.n0)
  canvas.rect(275, 146, 5, 2, P.c1)
  canvas.line(273, 152, 282, 152, P.c2)
  canvas.set(273, 162, P.n0)
  canvas.set(282, 162, P.n0)
}

const drawRocket = (canvas) => {
  canvas.polygon(
    [
      [376, 143],
      [381, 150],
      [381, 161],
      [371, 161],
      [371, 150],
    ],
    P.n0,
  )
  canvas.polygon(
    [
      [376, 145],
      [379, 151],
      [379, 159],
      [373, 159],
      [373, 151],
    ],
    P.c2,
  )
  canvas.rect(374, 152, 4, 4, P.b2)
  canvas.set(375, 153, P.b5)
  canvas.polygon(
    [
      [372, 157],
      [368, 163],
      [373, 161],
    ],
    P.w3,
  )
  canvas.polygon(
    [
      [380, 157],
      [384, 163],
      [379, 161],
    ],
    P.w3,
  )
  canvas.rect(373, 161, 7, 3, P.a1)
}

export const drawTravel = (canvas) => {
  // Hard receiver and contact shapes join the booth to the shared rear lobby.
  canvas.polygon(
    [
      [276, 153],
      [377, 153],
      [369, 164],
      [286, 164],
    ],
    P.a0,
  )
  canvas.rect(282, 158, 89, 5, P.w1)
  canvas.rect(270, 164, 115, 3, P.n0)

  // Deep rear box: quiet near-black wall, thick side returns, dark floor gap.
  canvas.outlineRect(280, 43, 96, 94, P.w1, P.n0, 2)
  canvas.outlineRect(284, 50, 88, 82, P.n2, P.n0, 2)
  canvas.rect(287, 53, 82, 75, P.n3)
  canvas.rect(287, 53, 82, 8, P.p1)
  canvas.rect(287, 125, 82, 7, P.n1)
  canvas.rect(287, 132, 82, 6, P.n0)
  canvas.line(306, 54, 306, 124, P.n2)
  canvas.line(346, 54, 346, 124, P.n2)

  // Lantern receivers remain hard, local, and visibly source-driven.
  canvas.rect(284, 55, 8, 39, P.a0)
  canvas.rect(292, 60, 4, 28, P.w3)
  canvas.rect(364, 55, 8, 39, P.a0)
  canvas.rect(360, 60, 4, 28, P.w3)
  canvas.rect(289, 126, 75, 5, P.a0)

  // Thick structural returns and handmade soffit.
  canvas.outlineRect(272, 39, 10, 117, P.w2, P.n0)
  canvas.rect(275, 42, 4, 111, P.w3)
  canvas.outlineRect(374, 39, 9, 117, P.w2, P.n0)
  canvas.rect(376, 42, 4, 111, P.w4)
  canvas.outlineRect(278, 40, 100, 13, P.w2, P.n0)
  canvas.rect(282, 43, 92, 6, P.w3)
  canvas.rect(282, 49, 92, 4, P.n1)

  // Patched rust-orange and cream canopy with a broken lower silhouette.
  canvas.outlineRect(270, 29, 112, 16, P.r2, P.n0)
  canvas.rect(272, 31, 108, 11, P.r3)
  for (const [x, width] of [
    [280, 10],
    [306, 11],
    [342, 10],
    [367, 8],
  ]) {
    canvas.rect(x, 31, width, 11, P.c3)
  }
  canvas.rect(272, 41, 108, 4, P.w1)
  for (const x of [273, 287, 301, 315, 329, 343, 357, 371]) {
    canvas.rect(x, 43, 8, 3, x % 2 === 0 ? P.c2 : P.r2)
  }
  canvas.rect(278, 31, 8, 4, P.r4)
  canvas.rect(346, 36, 7, 5, P.w4)

  // Individual rope-hung sign, exact lowercase text.
  canvas.line(313, 30, 313, 41, P.w1)
  canvas.line(344, 30, 344, 41, P.w1)
  canvas.outlineRect(307, 40, 44, 14, P.w2, P.n0)
  canvas.rect(310, 43, 38, 8, P.w3)
  canvas.text(316, 44, 'travel', P.c4)

  drawLantern(canvas, 286, 55)
  drawLantern(canvas, 368, 55)

  // Rear-wall travel inventory and exactly three route cards.
  canvas.rect(287, 67, 18, 3, P.w3)
  for (const y of [71, 75, 79]) {
    canvas.outlineRect(288, y, 15, 4, P.c1, P.n0)
    canvas.line(291, y + 1, 300, y + 1, P.c3)
  }
  canvas.rect(287, 84, 18, 17, P.w1)
  canvas.outlineRect(290, 87, 5, 10, P.c2, P.n0)
  canvas.outlineRect(297, 87, 5, 10, P.c2, P.n0)

  drawRouteCard(canvas, 309, 62, P.p4, 'left')
  drawRouteCard(canvas, 320, 62, P.b4, 'right')
  drawRouteCard(canvas, 331, 62, P.a3, 'left')

  drawHangingSuit(canvas)

  canvas.outlineRect(347, 103, 25, 16, P.w1, P.n0)
  canvas.text(352, 105, 'LAST', P.c4)
  canvas.text(350, 111, 'SEATS', P.a4)

  // Character and counter establish the front-to-back occlusion.
  drawHearthian(canvas)
  drawCounter(canvas)

  // Counter instruments remain compact and subordinate.
  drawOrbitalModel(canvas)
  canvas.outlineRect(309, 119, 10, 8, P.n4, P.n0)
  canvas.rect(312, 120, 4, 3, P.c2)
  canvas.line(317, 119, 319, 115, P.w4)
  drawScope(canvas)

  // Small frontage inventory and explicit, modest ground contacts.
  drawLuggage(canvas)
  drawRocket(canvas)
  canvas.rect(269, 165, 17, 2, P.n0)
  canvas.rect(370, 164, 15, 3, P.n0)

  // Booth-to-building attachments and sparse queue wear.
  canvas.rect(BAY_LEFT, 104, 5, 8, P.n1)
  canvas.rect(BAY_LEFT + 2, 106, 4, 4, P.n4)
  drawBolt(canvas, BAY_LEFT + 3, 108)
  canvas.rect(BAY_RIGHT - 4, 102, 5, 9, P.n1)
  canvas.rect(BAY_RIGHT - 5, 104, 4, 4, P.n4)
  drawBolt(canvas, BAY_RIGHT - 3, 106)
  canvas.line(292, 165, 304, 165, P.c1)
  canvas.line(335, 165, 348, 165, P.c1)
  canvas.set(309, 164, P.a2)
  canvas.set(354, 164, P.a2)
}
