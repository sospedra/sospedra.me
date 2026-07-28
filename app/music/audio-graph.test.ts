import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyAudioGraphSettings,
  createMusicAudioGraph,
  type MusicAudioGraph,
} from './audio-graph.ts'
import { EQ_FREQUENCIES } from './equalizer.ts'

type ParameterCall = [value: number, startTime: number, timeConstant: number]

type RecordedAudioParam = AudioParam & {
  calls: ParameterCall[]
}

type RecordedNode = AudioNode & {
  connections: AudioNode[]
}

const audioParam = (value = 0): RecordedAudioParam =>
  ({
    calls: [],
    value,
    setTargetAtTime(
      this: RecordedAudioParam,
      nextValue: number,
      startTime: number,
      timeConstant: number,
    ) {
      this.value = nextValue
      this.calls.push([nextValue, startTime, timeConstant])
      return this
    },
  }) as unknown as RecordedAudioParam

const audioNode = (): RecordedNode =>
  ({
    connections: [],
    connect(this: RecordedNode, destination: AudioNode) {
      this.connections.push(destination)
      return destination
    },
    disconnect() {},
  }) as unknown as RecordedNode

const graphFixture = () => {
  const source = audioNode() as MediaElementAudioSourceNode & RecordedNode
  const filters: Array<BiquadFilterNode & RecordedNode> = []
  const gains: Array<GainNode & RecordedNode> = []
  const panner = Object.assign(audioNode(), {
    pan: audioParam(),
  }) as StereoPannerNode & RecordedNode
  const analyser = Object.assign(audioNode(), {
    fftSize: 0,
    smoothingTimeConstant: 0,
  }) as AnalyserNode & RecordedNode
  const destination = audioNode()

  const context = {
    currentTime: 7,
    destination,
    createAnalyser: () => analyser,
    createBiquadFilter: () => {
      const filter = Object.assign(audioNode(), {
        frequency: audioParam(),
        gain: audioParam(),
        Q: audioParam(),
        type: 'peaking',
      }) as unknown as BiquadFilterNode & RecordedNode
      filters.push(filter)
      return filter
    },
    createGain: () => {
      const gain = Object.assign(audioNode(), {
        gain: audioParam(),
      }) as GainNode & RecordedNode
      gains.push(gain)
      return gain
    },
    createMediaElementSource: () => source,
    createStereoPanner: () => panner,
  } as unknown as AudioContext

  const graph = createMusicAudioGraph(
    context,
    {} as HTMLMediaElement,
  ) as MusicAudioGraph & {
    analyser: AnalyserNode & RecordedNode
    filters: Array<BiquadFilterNode & RecordedNode>
    output: GainNode & RecordedNode
    panner: StereoPannerNode & RecordedNode
    preamp: GainNode & RecordedNode
    source: MediaElementAudioSourceNode & RecordedNode
  }

  return { analyser, destination, filters, gains, graph, panner, source }
}

test('creates the ten-band processing graph in audible order', () => {
  const { analyser, destination, filters, gains, graph, panner, source } =
    graphFixture()

  assert.equal(graph.filters.length, EQ_FREQUENCIES.length)
  assert.deepEqual(
    filters.map((filter) => filter.frequency.value),
    EQ_FREQUENCIES,
  )
  assert.equal(filters[0]?.type, 'lowshelf')
  assert.ok(filters.slice(1, -1).every((filter) => filter.type === 'peaking'))
  assert.equal(filters.at(-1)?.type, 'highshelf')
  assert.ok(filters.every((filter) => filter.Q.value === 1.1))

  assert.equal(source.connections[0], filters[0])
  filters.slice(0, -1).forEach((filter, index) => {
    assert.equal(filter.connections[0], filters[index + 1])
  })
  assert.equal(filters.at(-1)?.connections[0], gains[0])
  assert.equal(gains[0]?.connections[0], panner)
  assert.equal(panner.connections[0], gains[1])
  assert.equal(gains[1]?.connections[0], analyser)
  assert.equal(analyser.connections[0], destination)
  assert.equal(analyser.fftSize, 256)
  assert.equal(analyser.smoothingTimeConstant, 0.78)
})

test('writes band gains, preamp, balance, and volume to live nodes', () => {
  const { graph } = graphFixture()
  const bands = [-12, -9, -6, -3, 0, 3, 6, 9, 11, 12]

  applyAudioGraphSettings(graph, {
    balance: 2,
    bands,
    enabled: true,
    preamp: 6,
    volume: -0.5,
  })

  graph.filters.forEach((filter, index) => {
    assert.deepEqual((filter.gain as RecordedAudioParam).calls.at(-1), [
      bands[index],
      7,
      0.012,
    ])
  })
  const preampCall = (graph.preamp.gain as RecordedAudioParam).calls.at(-1)
  assert.ok(preampCall)
  assert.ok(Math.abs(preampCall[0] - 10 ** (6 / 20)) < 0.000_001)
  assert.deepEqual(
    (graph.panner.pan as RecordedAudioParam).calls.at(-1),
    [1, 7, 0.012],
  )
  assert.deepEqual(
    (graph.output.gain as RecordedAudioParam).calls.at(-1),
    [0, 7, 0.012],
  )

  applyAudioGraphSettings(graph, {
    balance: -2,
    bands,
    enabled: false,
    preamp: 6,
    volume: 2,
  })

  assert.ok(
    graph.filters.every(
      (filter) => (filter.gain as RecordedAudioParam).calls.at(-1)?.[0] === 0,
    ),
  )
  assert.equal((graph.preamp.gain as RecordedAudioParam).calls.at(-1)?.[0], 1)
  assert.equal((graph.panner.pan as RecordedAudioParam).calls.at(-1)?.[0], -1)
  assert.equal((graph.output.gain as RecordedAudioParam).calls.at(-1)?.[0], 1)
})
