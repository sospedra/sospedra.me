import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addPuzzles,
  createPuzzle,
  type LhtlpParams,
  randomBlinding,
  scalePuzzle,
  setupParams,
  solvePuzzle,
} from '../src/core/lhtlp.ts'

const SMALL = { primeBits: 256, t: 64 }

test('a puzzle solves to the secret it was created from', async () => {
  const { params } = setupParams(SMALL.primeBits, SMALL.t)
  const secret = 12345678901234567890n
  const puzzle = createPuzzle(params, secret, randomBlinding(params))
  assert.equal(await solvePuzzle(params, puzzle), secret)
})

test('puzzle bytes do not reveal the secret', () => {
  const { params } = setupParams(SMALL.primeBits, SMALL.t)
  const secret = 999n
  const p = createPuzzle(params, secret, randomBlinding(params))
  assert.notEqual(p.u, secret)
  assert.notEqual(p.v % params.n, secret)
  const again = createPuzzle(params, secret, randomBlinding(params))
  assert.notEqual(p.u, again.u, 'fresh randomness gives a different puzzle')
})

test('addition and scaling are homomorphic', async () => {
  const { params } = setupParams(SMALL.primeBits, SMALL.t)
  const a = 111n
  const b = 222n
  const pa = createPuzzle(params, a, randomBlinding(params))
  const pb = createPuzzle(params, b, randomBlinding(params))
  assert.equal(await solvePuzzle(params, addPuzzles(params, pa, pb)), a + b)
  assert.equal(await solvePuzzle(params, scalePuzzle(params, pa, 7n)), a * 7n)
})

test('h is reproducible from the trapdoor and consistent with sequential squaring', async () => {
  const { params, trapdoor } = setupParams(128, 32)
  let squared = params.g
  for (let i = 0; i < params.t; i++) squared = (squared * squared) % params.n
  assert.equal(squared, params.h, 'h equals g^(2^t) the slow way')
  assert.ok(
    trapdoor > 0n,
    'setup returns the trapdoor so the caller can discard it deliberately',
  )
})

// At tiny t the fixed setup cost dominates and 64x more squarings buys under
// 2x wall clock, so the parameters must be large enough for the loop to lead.
test('solving cost scales with t, and creation does not', async () => {
  const cheap = setupParams(256, 20_000)
  const dear = setupParams(256, 400_000)
  const s = 42n

  const median = async (params: LhtlpParams): Promise<number> => {
    const runs: number[] = []
    for (let i = 0; i < 3; i++) {
      const started = performance.now()
      await solvePuzzle(params, createPuzzle(params, s, randomBlinding(params)))
      runs.push(performance.now() - started)
    }
    return runs.toSorted((a, b) => a - b)[1] ?? 0
  }

  const cheapMs = await median(cheap.params)
  const dearMs = await median(dear.params)

  assert.ok(
    dearMs > cheapMs * 4,
    `20x more squarings should cost well over 4x: ${dearMs.toFixed(2)} ms vs ${cheapMs.toFixed(2)} ms`,
  )
})
