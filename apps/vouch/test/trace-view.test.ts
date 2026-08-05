import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CheckLog, VerifyErrorCode } from '../src/protocol/verify.ts'
import { scenarios } from '../src/scenarios/index.ts'
import type { Scenario } from '../src/scenarios/trace.ts'
import {
  groupChecksIntoRounds,
  roundOutcomeSuffix,
  startsNewRound,
} from '../src/ui/trace-view.ts'

function passCheck(step: number): CheckLog {
  return { step, name: `step-${step}`, pass: true }
}

function failCheck(step: number, error: VerifyErrorCode): CheckLog {
  return { step, name: `step-${step}`, pass: false, error }
}

function skipCheck(step: number): CheckLog {
  return { step, name: `step-${step}`, pass: false, skipped: true }
}

function passRound(length: number): CheckLog[] {
  return Array.from({ length }, (_, index) => passCheck(index + 1))
}

function scenarioBySlug(slug: string): Scenario {
  const found = scenarios.find((candidate) => candidate.meta.slug === slug)
  if (!found) throw new Error(`fixture: no scenario with slug ${slug}`)
  return found
}

function freshCallStarts(checks: CheckLog[]): number[] {
  return checks.flatMap((check, index) => (check.step === 1 ? [index] : []))
}

function expectedRounds(checks: CheckLog[]): CheckLog[][] {
  const starts = freshCallStarts(checks)
  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1] : checks.length
    return checks.slice(start, end)
  })
}

test('startsNewRound is true for the very first check of any run', () => {
  assert.equal(startsNewRound([], 1), true)
})

test('startsNewRound is false while steps keep increasing within a round', () => {
  const rounds = [[passCheck(1), passCheck(2)]]
  assert.equal(startsNewRound(rounds, 3), false)
})

test('startsNewRound is true once step resets to or below the last seen step', () => {
  const rounds = [[passCheck(1), passCheck(2), passCheck(3)]]
  assert.equal(startsNewRound(rounds, 1), true)
  assert.equal(startsNewRound(rounds, 3), true)
})

test('a single round of 19 sequential steps groups to exactly one round', () => {
  const checks = passRound(19)
  const rounds = groupChecksIntoRounds(checks)
  assert.equal(rounds.length, 1)
  assert.deepEqual(rounds[0], checks)
})

test('three resets (19 + 14 + 19 = 52) group to exactly three rounds', () => {
  const checks = [...passRound(19), ...passRound(14), ...passRound(19)]
  assert.equal(checks.length, 52)
  const rounds = groupChecksIntoRounds(checks)
  assert.deepEqual(
    rounds.map((round) => round.length),
    [19, 14, 19],
  )
})

test('equal-length adjacent rounds (19 + 19) stay two rounds, not one', () => {
  const checks = [...passRound(19), ...passRound(19)]
  const rounds = groupChecksIntoRounds(checks)
  assert.equal(rounds.length, 2)
  assert.deepEqual(rounds[0], checks.slice(0, 19))
  assert.deepEqual(rounds[1], checks.slice(19))
})

test('an empty array yields zero rounds and does not throw', () => {
  assert.deepEqual(groupChecksIntoRounds([]), [])
})

test('a round with zero skips reads "all steps pass"', () => {
  assert.equal(roundOutcomeSuffix(passRound(19)), 'all steps pass')
})

test('a round with one skip never reads "all steps pass"', () => {
  const round = [...passRound(17), skipCheck(18), passCheck(19)]
  const summary = roundOutcomeSuffix(round)
  assert.notStrictEqual(summary, 'all steps pass')
  assert.equal(summary, '18 of 19 steps pass, 1 skipped')
})

test('a round with two skips is arithmetically correct', () => {
  const round = [
    passCheck(1),
    skipCheck(2),
    passCheck(3),
    skipCheck(4),
    passCheck(5),
  ]
  assert.equal(roundOutcomeSuffix(round), '3 of 5 steps pass, 2 skipped')
})

test('a failing round names the failing step and its error code', () => {
  const round = [passCheck(1), passCheck(2), failCheck(3, 'NONCE_MISMATCH')]
  assert.equal(roundOutcomeSuffix(round), 'failed at step 3 (NONCE_MISMATCH)')
})

test('a failure takes precedence over any skip in the summary', () => {
  const round = [passCheck(1), skipCheck(2), failCheck(3, 'ROLLBACK_DETECTED')]
  assert.equal(
    roundOutcomeSuffix(round),
    'failed at step 3 (ROLLBACK_DETECTED)',
  )
})

test('a failure at the very first entry is named correctly', () => {
  const round = [
    failCheck(1, 'MALFORMED_TRANSPORT'),
    passCheck(2),
    passCheck(3),
  ]
  assert.equal(
    roundOutcomeSuffix(round),
    'failed at step 1 (MALFORMED_TRANSPORT)',
  )
})

test('a failure at the very last entry is named correctly', () => {
  const round = [passCheck(1), passCheck(2), failCheck(3, 'INVALID_SIGNATURE')]
  assert.equal(
    roundOutcomeSuffix(round),
    'failed at step 3 (INVALID_SIGNATURE)',
  )
})

test('s04 honest-query: one verifyBundle call groups to one round', () => {
  const checks = scenarioBySlug('honest-query').run().checks ?? []
  const rounds = groupChecksIntoRounds(checks)
  assert.deepEqual(rounds, expectedRounds(checks))
  assert.equal(rounds.length, 1)
})

test('s04 honest-query: the lone round never claims purity while a step is skipped', () => {
  const checks = scenarioBySlug('honest-query').run().checks ?? []
  const [round] = groupChecksIntoRounds(checks)
  assert.ok(round?.some((check) => check.skipped))
  assert.notStrictEqual(roundOutcomeSuffix(round ?? []), 'all steps pass')
})

test('s17 config-timelock: three verifyBundle calls group to three rounds', () => {
  const checks = scenarioBySlug('config-timelock').run().checks ?? []
  const rounds = groupChecksIntoRounds(checks)
  assert.deepEqual(rounds, expectedRounds(checks))
  assert.equal(rounds.length, 3)
})

test('s17 config-timelock: the forged round names its own failing step', () => {
  const checks = scenarioBySlug('config-timelock').run().checks ?? []
  const rounds = groupChecksIntoRounds(checks)
  const forgedRound = rounds.find((round) =>
    round.some((check) => !check.pass && !check.skipped),
  )
  assert.ok(forgedRound)
  const failing = forgedRound?.find((check) => !check.pass && !check.skipped)
  assert.ok(failing)
  if (!forgedRound || !failing) return
  assert.equal(
    roundOutcomeSuffix(forgedRound),
    `failed at step ${failing.step} (${failing.error ?? failing.name})`,
  )
})

test('s12 head-conflict-gossip: no verifyBundle calls means zero rounds', () => {
  const checks = scenarioBySlug('head-conflict-gossip').run().checks ?? []
  assert.deepEqual(checks, [])
  assert.deepEqual(groupChecksIntoRounds(checks), [])
})
