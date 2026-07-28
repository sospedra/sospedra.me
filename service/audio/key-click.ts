export const playKeyClick = (context: AudioContext, volume = 0.12) => {
  const duration = 0.02
  const buffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * duration),
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
  band.frequency.value = 1800 + Math.random() * 900
  band.Q.value = 0.7
  gain.gain.value = volume

  source.connect(band).connect(gain).connect(context.destination)
  source.start()
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
