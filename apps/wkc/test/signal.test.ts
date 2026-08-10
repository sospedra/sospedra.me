import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  captionFor,
  glyphFit,
  hueFor,
  IDLE_WAVE,
  KEY_ROWS,
  noteFor,
  pressFor,
  rgbFor,
  waveFor,
} from '../src/signal.ts'

const round = (value: number, digits: number): number =>
  Math.round(value * 10 ** digits) / 10 ** digits

test('hueFor maps the legacy keyCode range onto the hue wheel', () => {
  assert.equal(hueFor(0), 0)
  assert.equal(hueFor(255), 360)
  assert.equal(hueFor(65), (65 / 255) * 360)
})

test('IDLE_WAVE matches the reference shader defaults', () => {
  assert.deepEqual(IDLE_WAVE, {
    frequency: 1,
    amplitude: 0.5,
    split: 0.05,
    tint: [1, 1, 1],
  })
})

test('rgbFor peaks the channel that owns the hue', () => {
  const [redR, redG, redB] = rgbFor(0)
  assert.equal(round(redR, 3), 0.943)
  assert.equal(round(redG, 3), 0.297)
  assert.equal(redG, redB)

  const [greenR, greenG, greenB] = rgbFor(120)
  assert.equal(round(greenG, 3), 0.943)
  assert.equal(round(greenR, 3), 0.297)
  assert.equal(greenR, greenB)
})

test('waveFor anchors the F key on the old CapsLock shape', () => {
  const wave = waveFor({ which: 70, code: 'KeyF', key: 'f' })
  assert.equal(wave.frequency, 1.088)
  assert.equal(wave.amplitude, 0.636)
  assert.equal(wave.split, 0.045)
})

test('waveFor keeps physical neighbors one small step apart', () => {
  const l = waveFor({ which: 76, code: 'KeyL', key: 'l' })
  const semicolon = waveFor({ which: 186, code: 'Semicolon', key: ';' })
  assert.equal(round(semicolon.frequency - l.frequency, 3), 0.05)
  assert.equal(l.amplitude, semicolon.amplitude)
})

test('waveFor steps amplitude by keyboard row', () => {
  const q = waveFor({ which: 81, code: 'KeyQ', key: 'q' })
  const z = waveFor({ which: 90, code: 'KeyZ', key: 'z' })
  assert.equal(round(q.amplitude, 3), 0.586)
  assert.equal(round(z.amplitude, 3), 0.686)
})

test('waveFor separates the Shift pair by column, not row', () => {
  const left = waveFor({ which: 16, code: 'ShiftLeft', key: 'Shift' })
  const right = waveFor({ which: 16, code: 'ShiftRight', key: 'Shift' })
  assert.equal(left.amplitude, right.amplitude)
  assert.equal(round(left.frequency, 3), 0.888)
  assert.equal(round(right.frequency, 3), 1.438)
})

test('waveFor compresses unmapped keys into the same bands', () => {
  const wave = waveFor({ which: 38, code: 'ArrowUp', key: 'ArrowUp' })
  assert.equal(round(wave.frequency, 3), 0.985)
  assert.equal(round(wave.amplitude, 3), 0.554)
})

test('waveFor doubles the chromatic split for named keys', () => {
  const printable = waveFor({ which: 75, code: 'KeyK', key: 'k' })
  const control = waveFor({ which: 16, code: 'ShiftLeft', key: 'Shift' })
  assert.equal(printable.split, 0.045)
  assert.equal(control.split, 0.11)
})

test('waveFor tints by column hue with a white floor', () => {
  const { tint } = waveFor({ which: 70, code: 'KeyF', key: 'f' })
  assert.equal(round(tint[0], 3), 0.627)
  assert.equal(round(tint[1], 3), 0.963)
  assert.equal(round(tint[2], 3), 0.543)
})

test('captionFor prints the tuned uniforms', () => {
  assert.equal(captionFor(IDLE_WAVE), 'freq 1.00 · amp 0.50 · split 0.050')
})

test('noteFor walks the home row through the pentatonic', () => {
  const f = noteFor({ which: 70, code: 'KeyF', key: 'f' })
  assert.equal(f.kind, 'tone')
  assert.equal(f.kind === 'tone' ? f.frequency : 0, 220)
  assert.equal(f.name, 'A3')

  const l = noteFor({ which: 76, code: 'KeyL', key: 'l' })
  assert.equal(l.kind === 'tone' ? l.frequency : 0, 440)
  assert.equal(l.name, 'A4')

  const semicolon = noteFor({ which: 186, code: 'Semicolon', key: ';' })
  assert.equal(
    round(semicolon.kind === 'tone' ? semicolon.frequency : 0, 2),
    523.25,
  )
  assert.equal(semicolon.name, 'C5')
})

test('noteFor shifts octaves by row and booms the space bar', () => {
  const equal = noteFor({ which: 187, code: 'Equal', key: '=' })
  assert.equal(round(equal.kind === 'tone' ? equal.frequency : 0, 2), 2637.02)
  assert.equal(equal.name, 'E7')

  const space = noteFor({ which: 32, code: 'Space', key: ' ' })
  assert.equal(round(space.kind === 'tone' ? space.frequency : 0, 2), 65.41)
  assert.equal(space.name, 'C2')
})

test('noteFor keeps unmapped keys on the legacy pentatonic ramp', () => {
  const numpad = noteFor({ which: 97, code: 'Numpad1', key: '1' })
  assert.equal(numpad.kind, 'tone')
  assert.equal(numpad.kind === 'tone' ? numpad.frequency : 0, 440)
  assert.equal(numpad.name, 'A4')
})

test('pressFor synthesizes letter presses from the code', () => {
  assert.deepEqual(pressFor('KeyQ'), { code: 'KeyQ', key: 'q', which: 81 })
  assert.deepEqual(pressFor('KeyF'), { code: 'KeyF', key: 'f', which: 70 })
})

test('pressFor synthesizes digit presses from the code', () => {
  assert.deepEqual(pressFor('Digit7'), { code: 'Digit7', key: '7', which: 55 })
  assert.deepEqual(pressFor('Digit0'), { code: 'Digit0', key: '0', which: 48 })
})

test('pressFor maps punctuation onto legacy keyCodes', () => {
  assert.deepEqual(pressFor('Semicolon'), {
    code: 'Semicolon',
    key: ';',
    which: 186,
  })
  assert.deepEqual(pressFor('Backquote'), {
    code: 'Backquote',
    key: '`',
    which: 192,
  })
  assert.deepEqual(pressFor('Quote'), { code: 'Quote', key: "'", which: 222 })
})

test('pressFor keeps named control keys as multi-char keys', () => {
  assert.deepEqual(pressFor('Enter'), {
    code: 'Enter',
    key: 'Enter',
    which: 13,
  })
  assert.deepEqual(pressFor('Backspace'), {
    code: 'Backspace',
    key: 'Backspace',
    which: 8,
  })
  assert.deepEqual(pressFor('ShiftRight'), {
    code: 'ShiftRight',
    key: 'Shift',
    which: 16,
  })
})

test('pressFor gives the space bar a single-space key', () => {
  assert.deepEqual(pressFor('Space'), { code: 'Space', key: ' ', which: 32 })
})

test('glyphFit sizes the glyph to the padded viewport', () => {
  assert.equal(glyphFit(13), 'calc((100vw - 2 * var(--frame-pad)) / 8.45)')
  assert.equal(glyphFit(4), 'calc((100vw - 2 * var(--frame-pad)) / 2.60)')
})

test('glyphFit clamps empty codes to one glyph', () => {
  assert.equal(glyphFit(0), 'calc((100vw - 2 * var(--frame-pad)) / 0.65)')
})

test('every pad code yields a complete press', () => {
  for (const code of KEY_ROWS.flat()) {
    const press = pressFor(code)
    assert.equal(press.code, code)
    assert.ok(press.key.length >= 1, `${code} has an empty key`)
    assert.ok(press.which > 0, `${code} has no legacy keyCode`)
  }
})

test('noteFor turns named keys into noise hits', () => {
  const shift = noteFor({ which: 16, code: 'ShiftLeft', key: 'Shift' })
  assert.equal(shift.kind, 'hit')
  assert.equal(round(shift.kind === 'hit' ? shift.center : 0, 2), 650.98)
  assert.equal(shift.name, 'noise')

  const space = noteFor({ which: 32, code: 'Space', key: ' ' })
  assert.equal(space.kind, 'tone')
})
