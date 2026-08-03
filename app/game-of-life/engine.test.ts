import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boundsOf,
  type CellKey,
  type CellSet,
  cellOf,
  evolve,
  keyOf,
  parseRle,
  rasterLine,
} from './engine.ts'

const cellsOf = (...cells: readonly (readonly [number, number])[]): CellSet =>
  new Set(cells.map(([x, y]) => keyOf(x, y)))

const step = (cells: CellSet, generations = 1): CellSet => {
  let current = cells
  for (let index = 0; index < generations; index += 1) {
    current = evolve(current).cells
  }
  return current
}

test('a blinker oscillates with period two', () => {
  const vertical = cellsOf([0, -1], [0, 0], [0, 1])
  const horizontal = cellsOf([-1, 0], [0, 0], [1, 0])
  assert.deepEqual(step(vertical), horizontal)
  assert.deepEqual(step(vertical, 2), vertical)
})

test('a block is a still life', () => {
  const block = cellsOf([0, 0], [1, 0], [0, 1], [1, 1])
  assert.deepEqual(step(block), block)
})

test('a glider moves one cell down-right every four generations', () => {
  const glider = parseRle('bob$2bo$3o!')
  const shifted = new Set(
    [...glider].map((key) => {
      const [x, y] = cellOf(key)
      return keyOf(x + 1, y + 1)
    }),
  )
  assert.deepEqual(step(glider, 4), shifted)
})

test('parseRle decodes the shipped R-pentomino preset string', () => {
  const expected = cellsOf([1, 0], [2, 0], [0, 1], [1, 1], [1, 2])
  assert.deepEqual(parseRle('b2o$2o$bo!'), expected)
  const framed = '#N R-pentomino\nx = 3, y = 3, rule = B3/S23\nb2o$2o\n$bo!'
  assert.deepEqual(parseRle(framed), expected)
})

test('boundsOf frames the live cells', () => {
  assert.deepEqual(boundsOf(cellsOf([2, -1], [5, 3])), {
    minX: 2,
    minY: -1,
    maxX: 5,
    maxY: 3,
    width: 4,
    height: 5,
  })
  assert.deepEqual(boundsOf(new Set<CellKey>()), {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    width: 1,
    height: 1,
  })
})

test('rasterLine includes both endpoints', () => {
  assert.deepEqual(rasterLine([0, 0], [3, 0]), [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ])
  assert.deepEqual(rasterLine([2, 5], [2, 5]), [[2, 5]])
})

test('rasterLine walks a diagonal cell by cell', () => {
  assert.deepEqual(rasterLine([0, 0], [3, 3]), [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
  ])
  assert.deepEqual(rasterLine([1, 1], [-2, -2]), [
    [1, 1],
    [0, 0],
    [-1, -1],
    [-2, -2],
  ])
})
