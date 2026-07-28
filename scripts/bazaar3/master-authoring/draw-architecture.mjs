import { drawBolt, P } from './pixel-canvas.mjs'

const drawWallPanels = (canvas) => {
  canvas.rect(0, 9, 416, 146, P.n2)
  const panels = [
    [0, 9, 31, P.n1],
    [31, 9, 118, P.n3],
    [162, 9, 93, P.n2],
    [268, 9, 117, P.n3],
    [385, 9, 31, P.n2],
  ]
  for (const [x, y, width, color] of panels) {
    canvas.rect(x, y, width, 146, color)
  }

  canvas.line(31, 9, 31, 155, P.n0)
  canvas.line(385, 9, 385, 155, P.n0)
  canvas.line(0, 42, 416, 42, P.n1)
  canvas.line(31, 96, 149, 96, P.n2)
  canvas.line(162, 96, 255, 96, P.n1)
  canvas.line(268, 96, 385, 96, P.n2)

  for (const x of [37, 143, 168, 249, 274, 379, 391, 409]) {
    drawBolt(canvas, x, 14)
  }
}

const drawCeiling = (canvas) => {
  canvas.rect(0, 0, 416, 9, P.n3)
  canvas.rect(0, 0, 416, 2, P.n0)
  canvas.rect(0, 3, 416, 2, P.n5)
  canvas.rect(0, 7, 416, 2, P.n1)
}

const drawSharedFloor = (canvas) => {
  canvas.rect(0, 155, 416, 32, P.n5)
  canvas.rect(0, 155, 416, 2, P.n6)
  canvas.rect(0, 158, 416, 13, P.n4)
  canvas.rect(0, 176, 416, 11, P.n4)

  for (const x of [75, 149, 226, 303, 385]) {
    canvas.line(x, 157, x, 170, P.n3)
    canvas.line(x + 17, 176, x + 17, 186, P.n3)
  }

  canvas.rect(0, 171, 416, 5, P.n0)
  canvas.rect(0, 172, 416, 1, P.n6)
  for (let x = 3; x < 416; x += 9) {
    canvas.rect(x, 173, 5, 2, P.n3)
  }

  canvas.polygon(
    [
      [207, 181],
      [215, 181],
      [215, 178],
      [224, 183],
      [215, 186],
      [215, 184],
      [207, 184],
    ],
    P.a1,
  )
  canvas.polygon(
    [
      [347, 181],
      [355, 181],
      [355, 178],
      [364, 183],
      [355, 186],
      [355, 184],
      [347, 184],
    ],
    P.a1,
  )

  canvas.rect(0, 187, 416, 8, P.n2)
  canvas.rect(0, 187, 416, 2, P.n0)
  canvas.rect(0, 190, 416, 2, P.n4)
  canvas.rect(0, 194, 416, 1, P.n6)
  canvas.rect(0, 195, 416, 4, P.n0)
}

const drawSharedReceivers = (canvas) => {
  // Hard, palette-locked receiver bands from visible stall sources.
  canvas.polygon(
    [
      [86, 77],
      [118, 77],
      [129, 96],
      [77, 96],
    ],
    P.w0,
  )
  canvas.polygon(
    [
      [169, 124],
      [194, 124],
      [202, 155],
      [165, 155],
    ],
    P.b0,
  )
  canvas.polygon(
    [
      [271, 93],
      [307, 93],
      [317, 155],
      [268, 155],
    ],
    P.w0,
  )
  canvas.rect(97, 155, 28, 3, P.w1)
  canvas.rect(171, 155, 27, 3, P.b1)
  canvas.rect(276, 155, 36, 3, P.w2)
}

const drawStairCore = (canvas) => {
  canvas.rect(0, 17, 31, 138, P.n0)
  canvas.rect(2, 18, 27, 136, P.n2)
  canvas.rect(4, 20, 22, 132, P.n1)
  canvas.rect(27, 9, 4, 146, P.n4)
  canvas.rect(28, 10, 1, 144, P.n6)

  for (let step = 0; step < 10; step += 1) {
    const y = 147 - step * 9
    const left = 2 + Math.min(12, step)
    canvas.rect(left, y, 27 - left, 2, P.n0)
    canvas.rect(left + 1, y, 25 - left, 1, P.n5)
  }

  canvas.rect(2, 98, 25, 3, P.n0)
  canvas.rect(3, 98, 23, 1, P.n6)
  canvas.line(3, 149, 3, 34, P.n6)
  canvas.line(23, 146, 23, 25, P.n5)
  canvas.line(3, 34, 23, 25, P.n5)

  canvas.outlineRect(5, 47, 21, 10, P.a0, P.n0)
  canvas.rect(7, 49, 17, 6, P.a1)
  canvas.text(8, 49, '↑UP', P.e0)

  canvas.rect(0, 152, 31, 5, P.n0)
  canvas.rect(2, 152, 27, 2, P.n6)
  canvas.line(29, 145, 29, 172, P.n0, 2)
  canvas.rect(28, 169, 5, 6, P.n3)
}

const drawRightUtilities = (canvas) => {
  canvas.rect(397, 18, 5, 137, P.n0)
  canvas.rect(398, 19, 2, 135, P.n5)
  canvas.rect(393, 55, 12, 14, P.n0)
  canvas.rect(395, 57, 8, 10, P.n3)
  canvas.rect(397, 59, 4, 4, P.b3)
  canvas.line(400, 155, 400, 174, P.n0, 2)
  canvas.rect(397, 169, 7, 6, P.n3)
}

export const drawArchitectureRear = (canvas) => {
  drawWallPanels(canvas)
  drawCeiling(canvas)
  drawSharedReceivers(canvas)
  drawSharedFloor(canvas)
  drawStairCore(canvas)
  drawRightUtilities(canvas)
}

const drawHBeam = (canvas, x, leftReceiver, rightReceiver) => {
  canvas.rect(x, 0, 13, 195, P.n0)
  canvas.rect(x + 2, 0, 9, 195, P.n4)
  canvas.rect(x + 3, 0, 2, 195, P.n5)
  canvas.rect(x + 8, 0, 2, 195, P.n2)
  canvas.rect(x - 2, 0, 17, 6, P.n0)
  canvas.rect(x, 1, 13, 4, P.n5)
  canvas.rect(x - 2, 145, 17, 13, P.n0)
  canvas.rect(x, 147, 13, 9, P.n4)
  canvas.rect(x - 2, 186, 17, 9, P.n0)
  canvas.rect(x, 188, 13, 5, P.n4)

  if (leftReceiver) canvas.rect(x + 1, 83, 2, 18, leftReceiver)
  if (rightReceiver) canvas.rect(x + 10, 112, 2, 17, rightReceiver)

  for (const y of [3, 51, 102, 151, 190]) {
    drawBolt(canvas, x + 3, y)
    drawBolt(canvas, x + 9, y)
  }
}

export const drawArchitectureFront = (canvas) => {
  drawHBeam(canvas, 149, P.a0, P.b0)
  drawHBeam(canvas, 255, P.b0, P.a0)

  // Reassert the canonical full-width rail edges after every foreground layer.
  canvas.rect(0, 187, 416, 2, P.n0)
  canvas.rect(0, 190, 416, 2, P.n4)
  canvas.rect(0, 194, 416, 1, P.n6)
  canvas.rect(0, 195, 416, 4, P.n0)
}
