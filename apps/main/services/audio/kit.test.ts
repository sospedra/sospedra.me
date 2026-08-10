import assert from 'node:assert/strict'
import test from 'node:test'
import { createSfxKit, ensureRunning } from './kit.ts'

class FakeAudioContext {
  state: AudioContextState = 'running'
  closeCalls = 0
  resume() {
    return Promise.resolve()
  }
  close() {
    this.closeCalls += 1
    this.state = 'closed'
    return Promise.resolve()
  }
}

const withWindow = (run: () => void) => {
  const host = globalThis as { window?: unknown }
  host.window = { AudioContext: FakeAudioContext }
  try {
    run()
  } finally {
    delete host.window
  }
}

const fakeContext = (state: string, resume?: () => Promise<void>) => {
  const calls: string[] = []
  const context = {
    state,
    resume: () => {
      calls.push('resume')
      return resume ? resume() : Promise.resolve()
    },
  } as unknown as AudioContext
  return { calls, context }
}

test('an interrupted context gets a resume call', () => {
  const fake = fakeContext('interrupted')
  ensureRunning(fake.context)
  assert.deepEqual(fake.calls, ['resume'])
})

test('a suspended context gets a resume call', () => {
  const fake = fakeContext('suspended')
  ensureRunning(fake.context)
  assert.deepEqual(fake.calls, ['resume'])
})

test('a running context is left alone', () => {
  const fake = fakeContext('running')
  ensureRunning(fake.context)
  assert.deepEqual(fake.calls, [])
})

test('a closed context is left alone', () => {
  const fake = fakeContext('closed')
  ensureRunning(fake.context)
  assert.deepEqual(fake.calls, [])
})

test('a rejected resume stays contained', async () => {
  const fake = fakeContext('interrupted', () => Promise.reject(new Error('no')))
  assert.doesNotThrow(() => ensureRunning(fake.context))
  await new Promise((resolve) => setImmediate(resolve))
})

test('dispose closes the context the kit owns', () => {
  withWindow(() => {
    const kit = createSfxKit()
    const context = kit.ensure() as unknown as FakeAudioContext
    kit.dispose()
    assert.equal(context.closeCalls, 1)
  })
})

test('ensure after dispose builds a fresh context', () => {
  withWindow(() => {
    const kit = createSfxKit()
    const first = kit.ensure()
    kit.dispose()
    const second = kit.ensure()
    assert.notEqual(second, null)
    assert.notEqual(second, first)
  })
})

test('dispose never closes a borrowed destination context', () => {
  const context = new FakeAudioContext()
  const destination = { context } as unknown as AudioNode
  const kit = createSfxKit({ destination })
  kit.ensure()
  kit.dispose()
  assert.equal(context.closeCalls, 0)
})
