import assert from 'node:assert/strict'
import test from 'node:test'
import { developInstantFilm } from './instant-film.ts'

const solidFrame = (width: number, height: number, value: number) => {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value
    data[index + 1] = value
    data[index + 2] = value
    data[index + 3] = 255
  }
  return data
}

const pixel = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
) => {
  const index = (y * width + x) * 4
  return Array.from(data.slice(index, index + 4))
}

test('instant-film development is deterministic for a capture seed', () => {
  const first = solidFrame(24, 24, 128)
  const second = first.slice()
  const differentSeed = first.slice()

  developInstantFilm(first, 24, 24, 42)
  developInstantFilm(second, 24, 24, 42)
  developInstantFilm(differentSeed, 24, 24, 43)

  assert.deepEqual(first, second)
  assert.notDeepEqual(first, differentSeed)
})

test('instant-film development lifts and cools deep shadows', () => {
  const frame = solidFrame(20, 20, 0)
  developInstantFilm(frame, 20, 20, 7)

  const [red, green, blue, alpha] = pixel(frame, 20, 10, 10)
  assert.ok(red > 0)
  assert.ok(green > red)
  assert.ok(blue > green)
  assert.equal(alpha, 255)
})

test('instant-film development warms highlights', () => {
  const frame = solidFrame(20, 20, 210)
  developInstantFilm(frame, 20, 20, 7)

  const [red, green, blue] = pixel(frame, 20, 10, 10)
  assert.ok(red > green)
  assert.ok(green > blue)
})

test('instant-film development gives bright edges a faint warm halo', () => {
  const width = 120
  const baseline = solidFrame(width, width, 0)
  const highlighted = baseline.slice()
  for (let y = 54; y < 66; y++) {
    for (let x = 54; x < 66; x++) {
      const index = (y * width + x) * 4
      highlighted[index] = 255
      highlighted[index + 1] = 255
      highlighted[index + 2] = 255
    }
  }

  developInstantFilm(baseline, width, width, 9)
  developInstantFilm(highlighted, width, width, 9)

  let redHalo = 0
  let greenHalo = 0
  for (let y = 48; y < 72; y++) {
    for (let x = 36; x < 54; x++) {
      const index = (y * width + x) * 4
      redHalo += highlighted[index] - baseline[index]
      greenHalo += highlighted[index + 1] - baseline[index + 1]
    }
  }

  assert.ok(redHalo > 0)
  assert.ok(redHalo > greenHalo)
})

test('instant-film development applies gentle corner falloff', () => {
  const frame = solidFrame(101, 101, 128)
  developInstantFilm(frame, 101, 101, 21)

  const center = pixel(frame, 101, 50, 50)
  const corner = pixel(frame, 101, 0, 0)
  const centerLight = center[0] + center[1] + center[2]
  const cornerLight = corner[0] + corner[1] + corner[2]

  assert.ok(cornerLight < centerLight)
  assert.ok(cornerLight > centerLight * 0.9)
})

test('instant-film development rejects malformed frame dimensions', () => {
  assert.throws(
    () => developInstantFilm(new Uint8ClampedArray(4), 2, 2, 1),
    /dimensions are invalid/,
  )
})
