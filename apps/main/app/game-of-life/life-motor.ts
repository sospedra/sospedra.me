export type Motor = {
  filter: BiquadFilterNode
  gain: GainNode
  hum: OscillatorNode
  humGain: GainNode
  lfo: OscillatorNode
  lfoDepth: GainNode
  source: AudioBufferSourceNode
}

const motorRate = (speed: number) => 1.2 + Math.min(30, speed) * 0.28
const motorFilterFrequency = (speed: number) => 420 + speed * 12
const motorHumFrequency = (speed: number) => 180 + speed * 5
const motorPulseDepth = (speed: number) => 0.006 + Math.min(speed, 24) * 0.00018

export const rampMotorDown = (
  context: AudioContext,
  current: Motor,
  immediate: boolean,
) => {
  const now = context.currentTime
  const stopAt = now + (immediate ? 0.01 : 0.14)
  current.gain.gain.cancelScheduledValues(now)
  current.gain.gain.setValueAtTime(
    Math.max(0.0001, current.gain.gain.value),
    now,
  )
  current.gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
  current.humGain.gain.cancelScheduledValues(now)
  current.humGain.gain.setValueAtTime(
    Math.max(0.0001, current.humGain.gain.value),
    now,
  )
  current.humGain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
  current.source.stop(stopAt + 0.01)
  current.hum.stop(stopAt + 0.01)
  current.lfo.stop(stopAt + 0.01)
}

export const tuneMotor = (
  context: AudioContext,
  motor: Motor,
  speed: number,
) => {
  const now = context.currentTime
  motor.lfo.frequency.setTargetAtTime(motorRate(speed), now, 0.06)
  motor.filter.frequency.setTargetAtTime(motorFilterFrequency(speed), now, 0.08)
  motor.hum.frequency.setTargetAtTime(motorHumFrequency(speed), now, 0.08)
  motor.lfoDepth.gain.setTargetAtTime(motorPulseDepth(speed), now, 0.08)
}

export const createMotor = (
  audioContext: AudioContext,
  destination: AudioNode,
  speed: number,
): Motor => {
  const seconds = 0.32
  const buffer = audioContext.createBuffer(
    1,
    Math.ceil(audioContext.sampleRate * seconds),
    audioContext.sampleRate,
  )
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) {
    const phase = index / data.length
    data[index] =
      (Math.random() * 2 - 1) * (0.35 + Math.sin(phase * Math.PI * 10) * 0.08)
  }

  const source = audioContext.createBufferSource()
  const filter = audioContext.createBiquadFilter()
  const gain = audioContext.createGain()
  const hum = audioContext.createOscillator()
  const humGain = audioContext.createGain()
  const lfo = audioContext.createOscillator()
  const lfoDepth = audioContext.createGain()
  const now = audioContext.currentTime

  source.buffer = buffer
  source.loop = true
  filter.type = 'bandpass'
  filter.frequency.value = motorFilterFrequency(speed)
  filter.Q.value = 0.8
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08)
  hum.type = 'sawtooth'
  hum.frequency.value = motorHumFrequency(speed)
  humGain.gain.setValueAtTime(0.0001, now)
  humGain.gain.exponentialRampToValueAtTime(0.018, now + 0.08)
  lfo.type = 'square'
  lfo.frequency.value = motorRate(speed)
  lfoDepth.gain.value = motorPulseDepth(speed)

  source.connect(filter).connect(gain).connect(destination)
  hum.connect(humGain).connect(destination)
  lfo.connect(lfoDepth).connect(gain.gain)
  source.start()
  hum.start()
  lfo.start()
  return { filter, gain, hum, humGain, lfo, lfoDepth, source }
}
