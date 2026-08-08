import assert from 'node:assert/strict'
import test from 'node:test'
import { DISC_LOOKS, DISCS } from './discs.ts'
import {
  BOOT_SPREAD,
  clampSpread,
  closedPageTransform,
  INITIAL_STATE,
  MAX_SPREAD,
  PAGE_COUNT,
  pageTransform,
  reduce,
  SPREAD_COUNT,
  slotOf,
  spreadDiscs,
  spreadLabel,
  type WalletState,
} from './wallet.ts'

test('discs carry unique ids and hues', () => {
  assert.equal(DISCS.length, 12)
  assert.equal(new Set(DISCS.map((disc) => disc.id)).size, DISCS.length)
  assert.equal(new Set(DISCS.map((disc) => disc.hue)).size, DISCS.length)
  for (const disc of DISCS) {
    assert.ok(disc.hue >= 0 && disc.hue < 360, `${disc.id} hue in range`)
    assert.ok(disc.title.length > 0, `${disc.id} has a title`)
    assert.ok(disc.oneLiner.length > 0, `${disc.id} has a one-liner`)
    assert.ok(disc.note.length > 0, `${disc.id} has a handwritten note`)
    assert.ok(DISC_LOOKS.includes(disc.look), `${disc.id} look is known`)
    assert.ok(disc.url.startsWith('https://'), `${disc.id} url is https`)
    assert.ok(disc.pressed >= 2015 && disc.pressed <= 2026, `${disc.id} year`)
  }
})

test('every look appears on at least two discs', () => {
  for (const look of DISC_LOOKS) {
    const count = DISCS.filter((disc) => disc.look === look).length
    assert.ok(count >= 2, `${look} appears ${count} times`)
  }
})

test('wallet geometry derives from the disc count', () => {
  assert.equal(PAGE_COUNT, 6)
  assert.equal(MAX_SPREAD, 6)
  assert.equal(SPREAD_COUNT, 7)
  assert.equal(BOOT_SPREAD, 0)
  assert.deepEqual(slotOf(0), { page: 0, side: 'a' })
  assert.deepEqual(slotOf(1), { page: 0, side: 'b' })
  assert.deepEqual(slotOf(10), { page: 5, side: 'a' })
})

test('every disc shows on exactly one spread', () => {
  const spreads = Array.from({ length: SPREAD_COUNT }, (_, index) => index)
  const shown = spreads.flatMap(spreadDiscs)
  assert.equal(shown.length, new Set(shown).size)
  assert.deepEqual(
    [...shown].sort((a, b) => a - b),
    DISCS.map((_, index) => index),
  )
  assert.deepEqual(spreadDiscs(0), [0])
  assert.deepEqual(spreadDiscs(1), [1, 2])
  assert.deepEqual(spreadDiscs(MAX_SPREAD), [11])
})

test('clampSpread bounds the range', () => {
  assert.equal(clampSpread(-3), 0)
  assert.equal(clampSpread(2), 2)
  assert.equal(clampSpread(MAX_SPREAD + 4), MAX_SPREAD)
})

test('boot opens the case, then settles onto the cover spread', () => {
  assert.deepEqual(reduce(INITIAL_STATE, { type: 'FLIP', direction: 1 }), {
    phase: 'boot',
  })
  assert.deepEqual(reduce(INITIAL_STATE, { type: 'PULL', disc: 0 }), {
    phase: 'boot',
  })
  const opening = reduce(INITIAL_STATE, { type: 'OPEN' })
  assert.deepEqual(opening, { phase: 'opening' })
  assert.deepEqual(reduce(opening, { type: 'FLIP', direction: 1 }), opening)
  assert.deepEqual(reduce(opening, { type: 'PULL', disc: 0 }), opening)
  assert.deepEqual(reduce(opening, { type: 'OPEN' }), opening)
  assert.deepEqual(reduce(opening, { type: 'BOOTED' }), {
    phase: 'browse',
    spread: BOOT_SPREAD,
  })
  assert.deepEqual(reduce(INITIAL_STATE, { type: 'BOOTED' }), {
    phase: 'browse',
    spread: BOOT_SPREAD,
  })
})

test('flip walks and clamps the spreads', () => {
  const start: WalletState = { phase: 'browse', spread: 0 }
  assert.deepEqual(reduce(start, { type: 'FLIP', direction: -1 }), {
    phase: 'browse',
    spread: 0,
  })
  const forward = reduce(start, { type: 'FLIP', direction: 1 })
  assert.deepEqual(forward, { phase: 'browse', spread: 1 })
  const atEnd: WalletState = { phase: 'browse', spread: MAX_SPREAD }
  assert.deepEqual(reduce(atEnd, { type: 'FLIP', direction: 1 }), atEnd)
})

test('pull accepts only discs on the visible spread', () => {
  const browsing: WalletState = { phase: 'browse', spread: 1 }
  assert.deepEqual(reduce(browsing, { type: 'PULL', disc: 5 }), browsing)
  assert.deepEqual(reduce(browsing, { type: 'PULL', disc: 2 }), {
    phase: 'eject',
    spread: 1,
    disc: 2,
  })
})

test('a pull walks eject, out, return, insert, browse', () => {
  const ejecting: WalletState = { phase: 'eject', spread: 1, disc: 2 }
  assert.deepEqual(reduce(ejecting, { type: 'FLIP', direction: 1 }), ejecting)
  assert.deepEqual(reduce(ejecting, { type: 'PULL', disc: 1 }), ejecting)
  const from = { dx: 80, dy: -20, size: 240 }
  const out = reduce(ejecting, { type: 'EJECTED', from })
  assert.deepEqual(out, { phase: 'out', spread: 1, disc: 2, from })
  assert.deepEqual(reduce(out, { type: 'FLIP', direction: 1 }), out)
  assert.deepEqual(reduce(out, { type: 'PULL', disc: 1 }), out)
  const returning = reduce(out, { type: 'PUT_BACK' })
  assert.deepEqual(returning, { phase: 'return', spread: 1, disc: 2, from })
  const inserting = reduce(returning, { type: 'RETURNED' })
  assert.deepEqual(inserting, { phase: 'insert', spread: 1, disc: 2 })
  assert.deepEqual(reduce(inserting, { type: 'INSERTED' }), {
    phase: 'browse',
    spread: 1,
  })
  assert.deepEqual(
    reduce({ phase: 'browse', spread: 1 }, { type: 'PUT_BACK' }),
    { phase: 'browse', spread: 1 },
  )
})

test('the zip closes the wallet from browse only', () => {
  assert.deepEqual(reduce({ phase: 'browse', spread: 2 }, { type: 'CLOSE' }), {
    phase: 'closing',
  })
  const out: WalletState = { phase: 'out', spread: 1, disc: 2, from: null }
  assert.deepEqual(reduce(out, { type: 'CLOSE' }), out)
  const closing: WalletState = { phase: 'closing' }
  assert.deepEqual(reduce(closing, { type: 'FLIP', direction: 1 }), closing)
  assert.deepEqual(reduce(closing, { type: 'PULL', disc: 0 }), closing)
})

test('closedPageTransform lies flat and dips away from the viewer', () => {
  for (let page = 0; page < PAGE_COUNT; page += 1) {
    const pose = closedPageTransform(page)
    assert.ok(pose.ry > 0 && pose.ry < 2, `page ${page} lies nearly flat`)
    if (page === 0) continue
    const previous = closedPageTransform(page - 1)
    assert.ok(pose.ry > previous.ry, `page ${page} dips deeper`)
    assert.ok(pose.z < previous.z, `page ${page} sits lower`)
  }
})

test('pageTransform fans resting pages and piles flipped ones', () => {
  assert.deepEqual(pageTransform(0, 0), { ry: -6, z: PAGE_COUNT * 1.6 })
  assert.deepEqual(pageTransform(0, 1), { ry: -172, z: PAGE_COUNT * 1.6 })
  const deep = pageTransform(PAGE_COUNT - 1, 0)
  assert.ok(deep.ry > -6, 'deeper resting pages fan right')
  assert.ok(deep.z < PAGE_COUNT * 1.6, 'deeper pages sit lower in the stack')
})

test('spreadLabel counts from one', () => {
  assert.equal(spreadLabel(0), 'SPREAD 1 / 7')
  assert.equal(spreadLabel(MAX_SPREAD), 'SPREAD 7 / 7')
})
