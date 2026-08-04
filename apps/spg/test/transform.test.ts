import assert from 'node:assert/strict'
import { test } from 'node:test'
import { transformCase } from '../src/spg/transform/case.ts'
import { transformLeet } from '../src/spg/transform/leet.ts'
import { transformLength } from '../src/spg/transform/length.ts'
import { transformRandom } from '../src/spg/transform/random.ts'
import { transformSymbols } from '../src/spg/transform/symbols.ts'

const BASE = 'correct horse battery staple'
const LEET_DICT: Record<string, string> = {
  a: '4',
  b: '8',
  e: '3',
  g: '9',
  l: '1',
  o: '0',
  s: '5',
  t: '7',
  z: '2',
}

test('transformLength keeps the minimum words to reach the target', () => {
  assert.equal(transformLength(8)(BASE), 'correct horse')
  assert.equal(transformLength(100)(BASE), BASE)
})

test('transformCase only upcases characters in place', () => {
  const result = transformCase(BASE)

  assert.equal(result.length, BASE.length)
  assert.equal(result.toLowerCase(), BASE)
})

test('transformLeet only substitutes from the leet dictionary', () => {
  const result = transformLeet(BASE)

  assert.equal(result.length, BASE.length)

  for (const [index, char] of [...BASE].entries()) {
    const out = result[index]
    assert.ok(out === char || out === LEET_DICT[char])
  }
})

test('transformRandom adds at most one char per word side', () => {
  const words = transformRandom(BASE).split(' ')
  const originals = BASE.split(' ')

  assert.equal(words.length, originals.length)

  for (const [index, word] of words.entries()) {
    assert.ok(word.includes(originals[index]))
    assert.ok(word.length <= originals[index].length + 2)
  }
})

test('transformSymbols replaces spaces with dots when disabled', () => {
  assert.equal(transformSymbols(false)(BASE), 'correct.horse.battery.staple')
})

test('transformSymbols removes or substitutes spaces when enabled', () => {
  assert.ok(!transformSymbols(true)(BASE).includes(' '))
})
