#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WIDTH = 320
const HEIGHT = 421
const WHITE = [255, 255, 255, 255]

const polygonContains = (x, y, points) => {
  let inside = false
  for (
    let left = 0, right = points.length - 1;
    left < points.length;
    right = left++
  ) {
    const [leftX, leftY] = points[left]
    const [rightX, rightY] = points[right]
    const intersects =
      leftY > y !== rightY > y &&
      x < ((rightX - leftX) * (y - leftY)) / (rightY - leftY) + leftX
    if (intersects) inside = !inside
  }
  return inside
}

const rect = (x, y, width, height) => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
})

const polygon = (points) => ({ kind: 'polygon', points })

const contains = (region, x, y) =>
  region.kind === 'rect'
    ? x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    : polygonContains(x + 0.5, y + 0.5, region.points)

const createMask = async (family, state, regions) => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4)
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!regions.some((region) => contains(region, x, y))) continue
      const offset = (y * WIDTH + x) * 4
      data[offset] = WHITE[0]
      data[offset + 1] = WHITE[1]
      data[offset + 2] = WHITE[2]
      data[offset + 3] = WHITE[3]
    }
  }

  const outputDirectory = path.resolve(
    `public/images/bazaar3/assets/stalls/${family}-v2/masks`,
  )
  await mkdir(outputDirectory, { recursive: true })
  await sharp(data, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: false,
    })
    .toFile(path.join(outputDirectory, `${state}.png`))
}

/*
 * These masks are intentionally disjoint. They admit only the expressive
 * anatomy named in the approved animation brief. In particular, each central
 * torso, seated/standing root, counter, sign and surrounding stall structure
 * falls in the transparent (hard-locked) area.
 */
const consoleHead = polygon([
  [103, 190],
  [132, 179],
  [180, 181],
  [203, 204],
  [202, 269],
  [181, 281],
  [124, 279],
  [102, 255],
])
const consoleLeftHand = polygon([
  [104, 219],
  [132, 219],
  [151, 251],
  [147, 315],
  [119, 326],
  [104, 302],
])
await createMask('console', 'idle-2', [
  consoleHead,
  rect(112, 281, 38, 48),
  rect(181, 282, 27, 45),
])
await createMask('console', 'hover-1', [consoleHead])
await createMask('console', 'hover-2', [consoleHead, consoleLeftHand])
await createMask('console', 'hover-3', [consoleHead, consoleLeftHand])

const projectsHead = polygon([
  [140, 135],
  [173, 132],
  [188, 145],
  [187, 187],
  [172, 199],
  [143, 193],
  [135, 165],
])
const projectsLeftArm = polygon([
  [119, 180],
  [148, 180],
  [154, 216],
  [144, 257],
  [119, 276],
  [105, 259],
  [112, 219],
])
const projectsRightArmAndCan = polygon([
  [174, 184],
  [199, 187],
  [207, 217],
  [224, 235],
  [221, 293],
  [197, 310],
  [171, 291],
  [181, 253],
])
const projectsSprout = polygon([
  [181, 246],
  [228, 246],
  [232, 319],
  [178, 319],
])
const projectsPresentedSprout = polygon([
  [173, 149],
  [216, 149],
  [219, 222],
  [174, 229],
])

await createMask('projects', 'idle-2', [
  projectsHead,
  projectsLeftArm,
  projectsRightArmAndCan,
  projectsSprout,
  projectsPresentedSprout,
])
await createMask('projects', 'hover-1', [projectsHead])
await createMask('projects', 'hover-2', [
  projectsHead,
  projectsLeftArm,
  projectsRightArmAndCan,
])
await createMask('projects', 'hover-3', [
  projectsHead,
  projectsLeftArm,
  projectsRightArmAndCan,
  projectsSprout,
])

const travelHead = polygon([
  [117, 158],
  [173, 156],
  [201, 171],
  [205, 207],
  [190, 226],
  [145, 229],
  [118, 211],
])
const travelTicketArm = polygon([
  [80, 106],
  [138, 106],
  [143, 205],
  [137, 265],
  [108, 283],
  [87, 259],
])
const travelRouteArm = polygon([
  [174, 144],
  [216, 144],
  [235, 170],
  [246, 226],
  [236, 287],
  [188, 293],
  [179, 265],
])

await createMask('travel', 'idle-2', [travelHead, rect(87, 184, 52, 83)])
await createMask('travel', 'hover-1', [travelHead])
await createMask('travel', 'hover-2', [travelHead, travelTicketArm])
await createMask('travel', 'hover-3', [
  travelHead,
  travelTicketArm,
  travelRouteArm,
])

console.log('Bazaar3 v2 motion masks written for Console, Projects and Travel.')
