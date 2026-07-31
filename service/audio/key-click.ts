type NoiseBurst = {
  at: number
  duration: number
  frequency: number
  q: number
  volume: number
}

const playNoiseBurst = (context: AudioContext, burst: NoiseBurst) => {
  const buffer = context.createBuffer(
    1,
    Math.max(1, Math.floor(context.sampleRate * burst.duration)),
    context.sampleRate,
  )
  const data = buffer.getChannelData(0)

  for (let index = 0; index < data.length; index += 1) {
    data[index] =
      (Math.random() * 2 - 1) * (1 - index / Math.max(1, data.length))
  }

  const source = context.createBufferSource()
  const band = context.createBiquadFilter()
  const gain = context.createGain()

  source.buffer = buffer
  band.type = 'bandpass'
  band.frequency.value = burst.frequency
  band.Q.value = burst.q
  gain.gain.value = burst.volume

  source.connect(band).connect(gain).connect(context.destination)
  source.start(burst.at)
}

export const playKeyClick = (context: AudioContext, volume = 0.12) =>
  playNoiseBurst(context, {
    at: context.currentTime,
    duration: 0.02,
    frequency: 1800 + Math.random() * 900,
    q: 0.7,
    volume,
  })

/* Carriage hop for clue navigation: a short descending ratchet and a
   felt-damped landing thunk, quieter and lower than a key strike. */
export const playCarriageShift = (context: AudioContext, volume = 0.1) => {
  const start = context.currentTime

  for (const [step, offset] of [0, 0.034, 0.068].entries()) {
    playNoiseBurst(context, {
      at: start + offset,
      duration: 0.016,
      frequency: 2400 - step * 380,
      q: 1.1,
      volume: volume * (0.5 + step * 0.25),
    })
  }

  playNoiseBurst(context, {
    at: start + 0.104,
    duration: 0.05,
    frequency: 320,
    q: 0.6,
    volume: volume * 1.35,
  })
}

export const playTypewriterBell = (context: AudioContext, volume = 0.16) => {
  const start = context.currentTime
  const duration = 0.72
  const output = context.createGain()

  output.gain.setValueAtTime(0.0001, start)
  output.gain.exponentialRampToValueAtTime(volume, start + 0.006)
  output.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  output.connect(context.destination)

  for (const [frequency, level] of [
    [1480, 1],
    [2960, 0.32],
    [4440, 0.1],
  ] as const) {
    const oscillator = context.createOscillator()
    const partial = context.createGain()

    oscillator.type = frequency === 1480 ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.985,
      start + duration,
    )
    partial.gain.value = level
    oscillator.connect(partial).connect(output)
    oscillator.start(start)
    oscillator.stop(start + duration)
  }
}
