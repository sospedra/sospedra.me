import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INITIAL_HEIGHT,
  INITIAL_PAINT,
  INITIAL_WIDTH,
  type PaintEvent,
  type PaintState,
  reduce,
  resizeRect,
} from './state.ts'

const run = (events: PaintEvent[], from: PaintState = INITIAL_PAINT) =>
  events.reduce(reduce, from)

const at = (x: number, y: number) => ({ x, y })

test('the initial state is a clean pencil on a 683 by 384 canvas', () => {
  assert.equal(INITIAL_PAINT.tool, 'pencil')
  assert.equal(INITIAL_PAINT.dirty, false)
  assert.equal(INITIAL_PAINT.zoom, 1)
  assert.deepEqual(INITIAL_PAINT.size, {
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
  })
  assert.equal(INITIAL_PAINT.mode.kind, 'idle')
})

test('a freehand stroke tracks the pointer and dirties on release', () => {
  const mid = run([
    { type: 'down', at: at(1, 1), button: 'left' },
    { type: 'move', at: at(3, 2) },
  ])
  assert.deepEqual(mid.mode, {
    kind: 'freehand',
    last: at(3, 2),
    button: 'left',
  })
  assert.equal(mid.dirty, false)
  const done = reduce(mid, { type: 'up', at: at(3, 2) })
  assert.equal(done.mode.kind, 'idle')
  assert.equal(done.dirty, true)
})

test('a right-button stroke remembers the button', () => {
  const state = run([{ type: 'down', at: at(1, 1), button: 'right' }])
  assert.equal(state.mode.kind === 'freehand' && state.mode.button, 'right')
})

test('point tools never enter a drag mode', () => {
  const armed = reduce(INITIAL_PAINT, { type: 'tool', tool: 'fill' })
  assert.equal(
    reduce(armed, { type: 'down', at: at(4, 4), button: 'left' }),
    armed,
  )
})

test('escape discards a shape in progress without dirtying', () => {
  const state = run([
    { type: 'tool', tool: 'rect' },
    { type: 'down', at: at(1, 1), button: 'left' },
    { type: 'move', at: at(6, 4) },
    { type: 'cancel' },
  ])
  assert.equal(state.mode.kind, 'idle')
  assert.equal(state.dirty, false)
})

test('a completed shape drag dirties the canvas', () => {
  const state = run([
    { type: 'tool', tool: 'ellipse' },
    { type: 'down', at: at(1, 1), button: 'left' },
    { type: 'move', at: at(6, 4) },
    { type: 'up', at: at(6, 4) },
  ])
  assert.equal(state.mode.kind, 'idle')
  assert.equal(state.dirty, true)
})

test('polygon gathers vertices per click and skips duplicates', () => {
  const twoPoints = run([
    { type: 'tool', tool: 'polygon' },
    { type: 'down', at: at(1, 1), button: 'left' },
    { type: 'move', at: at(5, 1) },
    { type: 'up', at: at(5, 1) },
  ])
  assert.equal(
    twoPoints.mode.kind === 'polygon' && twoPoints.mode.points.length,
    2,
  )
  const threePoints = run(
    [
      { type: 'down', at: at(5, 5), button: 'left' },
      { type: 'up', at: at(5, 5) },
    ],
    twoPoints,
  )
  assert.equal(
    threePoints.mode.kind === 'polygon' && threePoints.mode.points.length,
    3,
  )
  const duplicate = run(
    [
      { type: 'down', at: at(5, 5), button: 'left' },
      { type: 'up', at: at(5, 5) },
    ],
    threePoints,
  )
  assert.equal(
    duplicate.mode.kind === 'polygon' && duplicate.mode.points.length,
    3,
  )
})

test('a double click closes the polygon and dirties', () => {
  const pending = run([
    { type: 'tool', tool: 'polygon' },
    { type: 'down', at: at(1, 1), button: 'left' },
    { type: 'move', at: at(5, 1) },
    { type: 'up', at: at(5, 1) },
    { type: 'down', at: at(3, 6), button: 'left' },
    { type: 'up', at: at(3, 6) },
  ])
  const closed = reduce(pending, { type: 'dblclick' })
  assert.equal(closed.mode.kind, 'idle')
  assert.equal(closed.dirty, true)
})

test('a double click without a polygon in progress changes nothing', () => {
  assert.equal(reduce(INITIAL_PAINT, { type: 'dblclick' }), INITIAL_PAINT)
})

test('the curve walks line, first control, second control, then commits', () => {
  const line = run([
    { type: 'tool', tool: 'curve' },
    { type: 'down', at: at(0, 0), button: 'left' },
    { type: 'move', at: at(9, 3) },
    { type: 'up', at: at(9, 3) },
  ])
  assert.ok(line.mode.kind === 'curving' && line.mode.phase === 'c1')
  assert.equal(line.dirty, false)

  const bent = run(
    [
      { type: 'down', at: at(2, 8), button: 'left' },
      { type: 'move', at: at(3, 9) },
      { type: 'up', at: at(3, 9) },
    ],
    line,
  )
  assert.ok(bent.mode.kind === 'curving' && bent.mode.phase === 'c2')
  assert.deepEqual(bent.mode.kind === 'curving' && bent.mode.c1, at(3, 9))

  const committed = run(
    [
      { type: 'down', at: at(6, 8), button: 'left' },
      { type: 'up', at: at(6, 8) },
    ],
    bent,
  )
  assert.equal(committed.mode.kind, 'idle')
  assert.equal(committed.dirty, true)
})

test('a click without a drag cancels the curve', () => {
  const state = run([
    { type: 'tool', tool: 'curve' },
    { type: 'down', at: at(4, 4), button: 'left' },
    { type: 'up', at: at(4, 4) },
  ])
  assert.equal(state.mode.kind, 'idle')
  assert.equal(state.dirty, false)
})

test('switching tools abandons any pending geometry', () => {
  const state = run([
    { type: 'tool', tool: 'polygon' },
    { type: 'down', at: at(1, 1), button: 'left' },
    { type: 'move', at: at(5, 1) },
    { type: 'up', at: at(5, 1) },
    { type: 'tool', tool: 'line' },
  ])
  assert.equal(state.mode.kind, 'idle')
  assert.equal(state.tool, 'line')
})

test('re-selecting the active tool is a no-op', () => {
  assert.equal(
    reduce(INITIAL_PAINT, { type: 'tool', tool: 'pencil' }),
    INITIAL_PAINT,
  )
})

test('a selection drag normalizes into a rect', () => {
  const state = run([
    { type: 'tool', tool: 'select' },
    { type: 'down', at: at(5, 5), button: 'left' },
    { type: 'move', at: at(2, 3) },
    { type: 'up', at: at(2, 3) },
  ])
  assert.deepEqual(state.mode, {
    kind: 'selected',
    rect: { x: 2, y: 3, width: 4, height: 3 },
  })
  assert.equal(state.dirty, false)
})

test('a selection click without a drag selects nothing', () => {
  const state = run([
    { type: 'tool', tool: 'select' },
    { type: 'down', at: at(5, 5), button: 'left' },
    { type: 'up', at: at(5, 5) },
  ])
  assert.equal(state.mode.kind, 'idle')
})

test('grabbing a selection moves it by the pointer delta and dirties on drop', () => {
  const selected = run([
    { type: 'tool', tool: 'select' },
    { type: 'down', at: at(2, 2), button: 'left' },
    { type: 'move', at: at(6, 5) },
    { type: 'up', at: at(6, 5) },
  ])
  const dropped = run(
    [
      { type: 'grab', at: at(3, 3) },
      { type: 'move', at: at(8, 4) },
      { type: 'up', at: at(8, 4) },
    ],
    selected,
  )
  assert.deepEqual(dropped.mode, {
    kind: 'selected',
    rect: { x: 7, y: 3, width: 5, height: 4 },
  })
  assert.equal(dropped.dirty, true)
})

test('dragging a corner handle resizes the selection', () => {
  const selected = run([
    { type: 'tool', tool: 'select' },
    { type: 'down', at: at(10, 10), button: 'left' },
    { type: 'move', at: at(14, 14) },
    { type: 'up', at: at(14, 14) },
  ])
  const resized = run(
    [
      { type: 'grab-handle', handle: 'se', at: at(14, 14) },
      { type: 'move', at: at(20, 18) },
      { type: 'up', at: at(20, 18) },
    ],
    selected,
  )
  assert.deepEqual(resized.mode, {
    kind: 'selected',
    rect: { x: 10, y: 10, width: 11, height: 9 },
  })
  assert.equal(resized.dirty, true)
})

test('resizeRect clamps at one pixel instead of flipping', () => {
  const rect = { x: 10, y: 10, width: 5, height: 5 }
  assert.deepEqual(resizeRect(rect, 'e', at(2, 12)), {
    x: 10,
    y: 10,
    width: 1,
    height: 5,
  })
  assert.deepEqual(resizeRect(rect, 'nw', at(30, 30)), {
    x: 14,
    y: 14,
    width: 1,
    height: 1,
  })
})

test('select-rect switches to the select tool with the given rect', () => {
  const state = reduce(INITIAL_PAINT, {
    type: 'select-rect',
    rect: { x: 0, y: 0, width: INITIAL_WIDTH, height: INITIAL_HEIGHT },
  })
  assert.equal(state.tool, 'select')
  assert.equal(state.mode.kind, 'selected')
})

test('deselect returns a selection to idle', () => {
  const selected = reduce(INITIAL_PAINT, {
    type: 'select-rect',
    rect: { x: 1, y: 1, width: 4, height: 4 },
  })
  assert.equal(reduce(selected, { type: 'deselect' }).mode.kind, 'idle')
  assert.equal(reduce(INITIAL_PAINT, { type: 'deselect' }), INITIAL_PAINT)
})

test('commit marks the canvas dirty without touching the mode', () => {
  const state = reduce(INITIAL_PAINT, { type: 'commit' })
  assert.equal(state.dirty, true)
  assert.equal(state.mode.kind, 'idle')
})

test('a nub drag previews without resizing until the buffer swap lands', () => {
  const dragging = run([
    { type: 'resize-canvas', nub: 'se', at: at(683, 384) },
    { type: 'move', at: at(700, 400) },
  ])
  assert.ok(dragging.mode.kind === 'resizingCanvas')
  assert.deepEqual(dragging.size, {
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
  })
  const released = reduce(dragging, { type: 'up', at: at(700, 400) })
  assert.equal(released.mode.kind, 'idle')
  assert.deepEqual(released.size, {
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
  })
  const swapped = reduce(released, {
    type: 'canvas-resized',
    width: 700,
    height: 400,
  })
  assert.deepEqual(swapped.size, { width: 700, height: 400 })
  assert.equal(swapped.dirty, true)
})

test('cleared resets size, zoom, and the dirty flag', () => {
  const messy = run([
    { type: 'zoom', level: 6 },
    { type: 'commit' },
    { type: 'cleared', width: INITIAL_WIDTH, height: INITIAL_HEIGHT },
  ])
  assert.equal(messy.dirty, false)
  assert.equal(messy.zoom, 1)
})

test('opened adopts the file size and starts clean', () => {
  const state = run([
    { type: 'commit' },
    { type: 'opened', width: 320, height: 200 },
  ])
  assert.deepEqual(state.size, { width: 320, height: 200 })
  assert.equal(state.dirty, false)
})

test('saved clears the dirty flag and keeps the bitmap size', () => {
  const state = run([
    { type: 'canvas-resized', width: 700, height: 400 },
    { type: 'saved' },
  ])
  assert.equal(state.dirty, false)
  assert.deepEqual(state.size, { width: 700, height: 400 })
})

test('zoom, colors, and option patches merge into place', () => {
  const state = run([
    { type: 'zoom', level: 8 },
    { type: 'color', slot: 'fg', color: '#ff0000' },
    { type: 'color', slot: 'bg', color: '#0000ff' },
    { type: 'option', patch: { strokeSize: 3 } },
  ])
  assert.equal(state.zoom, 8)
  assert.equal(state.fg, '#ff0000')
  assert.equal(state.bg, '#0000ff')
  assert.equal(state.options.strokeSize, 3)
  assert.equal(state.options.eraserSize, INITIAL_PAINT.options.eraserSize)
})

test('pointer events outside any gesture are identities', () => {
  assert.equal(
    reduce(INITIAL_PAINT, { type: 'move', at: at(4, 4) }),
    INITIAL_PAINT,
  )
  assert.equal(
    reduce(INITIAL_PAINT, { type: 'up', at: at(4, 4) }),
    INITIAL_PAINT,
  )
  assert.equal(reduce(INITIAL_PAINT, { type: 'cancel' }), INITIAL_PAINT)
})
