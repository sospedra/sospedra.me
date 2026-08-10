import assert from 'node:assert/strict'
import test from 'node:test'
import { fanfareDuration, fanfareEvents, playFanfare } from './fanfare.ts'

class FakeParam {
  value = 0
  events: Array<[string, number, number]> = []
  setValueAtTime(value: number, at: number) {
    this.events.push(['set', value, at])
    return this
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.events.push(['linear', value, at])
    return this
  }
  exponentialRampToValueAtTime(value: number, at: number) {
    this.events.push(['exp', value, at])
    return this
  }
}

class FakeNode {
  targets: FakeNode[] = []
  connect(target: FakeNode) {
    this.targets.push(target)
    return target
  }
  disconnect() {
    this.targets = []
  }
}

const fanOut = (node: FakeNode): FakeNode[] => node.targets ?? []

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

class FakeOscillator extends FakeNode {
  type = 'sine'
  frequency = new FakeParam()
  detune = new FakeParam()
  started = 0
  onended: (() => void) | null = null
  start() {
    this.started += 1
  }
  stop() {}
}

class FakeFilter extends FakeNode {
  type = 'lowpass'
  frequency = new FakeParam()
  Q = new FakeParam()
}

class FakeDelay extends FakeNode {
  delayTime = new FakeParam()
}

class FakeContext {
  currentTime = 1
  destination = new FakeNode()
  oscillators: FakeOscillator[] = []
  createGain() {
    return new FakeGain()
  }
  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }
  createBiquadFilter() {
    return new FakeFilter()
  }
  createDelay() {
    return new FakeDelay()
  }
}

const asContext = (fake: FakeContext) => fake as unknown as AudioContext

test('the full phrase has nine ascending events', () => {
  const events = fanfareEvents('full')
  assert.equal(events.length, 9)
  for (const [index, event] of events.entries()) {
    assert.ok(event.duration > 0)
    assert.ok(event.frequency >= 200 && event.frequency <= 2000)
    if (index > 0) assert.ok(event.at > events[index - 1].at)
  }
})

test('the curt phrase is the three-event ending figure', () => {
  const events = fanfareEvents('curt')
  assert.equal(events.length, 3)
  assert.ok(fanfareDuration('curt') < fanfareDuration('full'))
})

test('durations cover the last event plus its length', () => {
  const events = fanfareEvents('full')
  const last = events[events.length - 1]
  assert.ok(fanfareDuration('full') >= last.at + last.duration)
})

test('playFanfare schedules oscillators and starts each once', () => {
  const fake = new FakeContext()
  playFanfare(asContext(fake))
  assert.ok(fake.oscillators.length > 30)
  for (const oscillator of fake.oscillators) {
    assert.equal(oscillator.started, 1)
  }
})

test('the curt variant schedules fewer oscillators than the full one', () => {
  const full = new FakeContext()
  playFanfare(asContext(full))
  const curt = new FakeContext()
  playFanfare(asContext(curt), { variant: 'curt' })
  assert.ok(curt.oscillators.length < full.oscillators.length)
})

test('output reaches the default destination', () => {
  const fake = new FakeContext()
  playFanfare(asContext(fake))
  assert.ok(fake.destination.targets.length === 0)
  const reaches = (node: FakeNode, seen: Set<FakeNode>): boolean => {
    if (node === (fake.destination as FakeNode)) return true
    if (seen.has(node)) return false
    seen.add(node)
    return fanOut(node).some((target) => reaches(target, seen))
  }
  const anyPath = fake.oscillators.some((oscillator) =>
    reaches(oscillator, new Set()),
  )
  assert.ok(anyPath)
})

test('a custom destination receives the output instead', () => {
  const fake = new FakeContext()
  const custom = new FakeNode()
  playFanfare(asContext(fake), { destination: custom as unknown as AudioNode })
  const reaches = (node: FakeNode, seen: Set<FakeNode>): boolean => {
    if (node === custom) return true
    if (seen.has(node)) return false
    seen.add(node)
    return fanOut(node).some((target) => reaches(target, seen))
  }
  assert.ok(
    fake.oscillators.some((oscillator) => reaches(oscillator, new Set())),
  )
  const touchesDefault = (node: FakeNode, seen: Set<FakeNode>): boolean => {
    if (node === (fake.destination as FakeNode)) return true
    if (seen.has(node)) return false
    seen.add(node)
    return fanOut(node).some((target) => touchesDefault(target, seen))
  }
  assert.ok(
    !fake.oscillators.some((oscillator) =>
      touchesDefault(oscillator, new Set()),
    ),
  )
})
