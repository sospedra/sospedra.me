import assert from 'node:assert/strict'
import test from 'node:test'
import {
  APP_IDS,
  bootApps,
  type DesktopAction,
  type DesktopState,
  INITIAL_DESKTOP,
  isAppId,
  nextVisibleApp,
  reduceDesktop,
} from './desktop.ts'

const run = (actions: DesktopAction[], from: DesktopState = INITIAL_DESKTOP) =>
  actions.reduce(reduceDesktop, from)

test('the desktop boots with every window closed and nothing focused', () => {
  assert.equal(INITIAL_DESKTOP.active, null)
  assert.ok(APP_IDS.every((app) => !INITIAL_DESKTOP.apps[app].open))
  assert.deepEqual(INITIAL_DESKTOP.winampPanels, {
    equalizer: true,
    player: true,
    tracklist: true,
  })
})

test('launch opens the window and focuses it', () => {
  const state = run([{ type: 'launch', app: 'paint' }])
  assert.equal(state.active, 'paint')
  assert.deepEqual(state.apps.paint, { open: true, minimized: false })
})

test('launch restores a minimized window', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'minimize', app: 'mines' },
    { type: 'launch', app: 'mines' },
  ])
  assert.equal(state.active, 'mines')
  assert.deepEqual(state.apps.mines, { open: true, minimized: false })
})

test('activate focuses an open window without touching the rest', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'launch', app: 'winamp' },
    { type: 'activate', app: 'mines' },
  ])
  assert.equal(state.active, 'mines')
  assert.equal(state.apps.winamp.open, true)
})

test('activate on a closed window is a no-op', () => {
  const state = run([{ type: 'launch', app: 'mines' }])
  assert.equal(reduceDesktop(state, { type: 'activate', app: 'paint' }), state)
})

test('activate on a minimized window is a no-op', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'launch', app: 'paint' },
    { type: 'minimize', app: 'mines' },
  ])
  assert.equal(reduceDesktop(state, { type: 'activate', app: 'mines' }), state)
})

test('minimizing the active window hands focus to the next visible one', () => {
  const state = run([
    { type: 'launch', app: 'winamp' },
    { type: 'launch', app: 'mines' },
    { type: 'minimize', app: 'mines' },
  ])
  assert.equal(state.active, 'winamp')
  assert.deepEqual(state.apps.mines, { open: true, minimized: true })
})

test('minimizing the last visible window leaves nothing focused', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'minimize', app: 'mines' },
  ])
  assert.equal(state.active, null)
})

test('minimizing a background window keeps the current focus', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'launch', app: 'paint' },
    { type: 'minimize', app: 'mines' },
  ])
  assert.equal(state.active, 'paint')
})

test('minimize on an already minimized window is a no-op', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'minimize', app: 'mines' },
  ])
  assert.equal(reduceDesktop(state, { type: 'minimize', app: 'mines' }), state)
})

test('closing the active window hands focus over, closing again is a no-op', () => {
  const open = run([
    { type: 'launch', app: 'realplayer' },
    { type: 'launch', app: 'paint' },
  ])
  const closed = reduceDesktop(open, { type: 'close', app: 'paint' })
  assert.equal(closed.active, 'realplayer')
  assert.deepEqual(closed.apps.paint, { open: false, minimized: false })
  assert.equal(reduceDesktop(closed, { type: 'close', app: 'paint' }), closed)
})

test('closing a background window keeps the current focus', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'launch', app: 'winamp' },
    { type: 'close', app: 'mines' },
  ])
  assert.equal(state.active, 'winamp')
})

test('close drops the minimized flag so a relaunch opens unminimized', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'minimize', app: 'mines' },
    { type: 'close', app: 'mines' },
  ])
  assert.deepEqual(state.apps.mines, { open: false, minimized: false })
})

test('focus falls back in APP_IDS order and skips minimized windows', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'launch', app: 'paint' },
    { type: 'launch', app: 'winamp' },
    { type: 'minimize', app: 'mines' },
    { type: 'minimize', app: 'winamp' },
  ])
  assert.equal(nextVisibleApp(state.apps, 'paint'), null)
  assert.equal(nextVisibleApp(state.apps, 'winamp'), 'paint')
})

test('isAppId accepts the four apps and nothing else', () => {
  assert.ok(APP_IDS.every(isAppId))
  assert.equal(isAppId('MINES'), false)
  assert.equal(isAppId('recycle'), false)
  assert.equal(isAppId(''), false)
})

test('bootApps reads the sw param into launchable app ids', () => {
  assert.deepEqual(bootApps('?sw=mines'), ['mines'])
  assert.deepEqual(bootApps('?sw=winamp,mines'), ['winamp', 'mines'])
})

test('bootApps drops unknown ids and keeps the valid ones', () => {
  assert.deepEqual(bootApps('?sw=doom,paint'), ['paint'])
})

test('bootApps opens nothing without a usable sw param', () => {
  assert.deepEqual(bootApps(''), [])
  assert.deepEqual(bootApps('?foo=1'), [])
  assert.deepEqual(bootApps('?sw='), [])
  assert.deepEqual(bootApps('?sw=doom'), [])
})

test('launch-winamp opens and focuses winamp with every panel visible', () => {
  const state = run([
    { type: 'launch-winamp' },
    { type: 'close-winamp-panel', panel: 'equalizer' },
    { type: 'launch-winamp' },
  ])
  assert.equal(state.active, 'winamp')
  assert.deepEqual(state.apps.winamp, { open: true, minimized: false })
  assert.deepEqual(state.winampPanels, {
    equalizer: true,
    player: true,
    tracklist: true,
  })
})

test('closing a side panel hides it and keeps winamp open', () => {
  const state = run([
    { type: 'launch-winamp' },
    { type: 'close-winamp-panel', panel: 'tracklist' },
  ])
  assert.equal(state.apps.winamp.open, true)
  assert.deepEqual(state.winampPanels, {
    equalizer: true,
    player: true,
    tracklist: false,
  })
})

test('closing the player panel closes winamp and hands focus over', () => {
  const state = run([
    { type: 'launch', app: 'mines' },
    { type: 'launch-winamp' },
    { type: 'close-winamp-panel', panel: 'player' },
  ])
  assert.equal(state.active, 'mines')
  assert.deepEqual(state.apps.winamp, { open: false, minimized: false })
  assert.deepEqual(state.winampPanels, {
    equalizer: false,
    player: false,
    tracklist: false,
  })
})

test('open-winamp-panel shows the panel and restores the window', () => {
  const state = run([
    { type: 'launch-winamp' },
    { type: 'close-winamp-panel', panel: 'equalizer' },
    { type: 'minimize', app: 'winamp' },
    { type: 'open-winamp-panel', panel: 'equalizer' },
  ])
  assert.equal(state.active, 'winamp')
  assert.deepEqual(state.apps.winamp, { open: true, minimized: false })
  assert.equal(state.winampPanels.equalizer, true)
})

test('open-winamp-panel on a visible panel keeps the visibility object', () => {
  const opened = run([{ type: 'launch-winamp' }])
  const again = reduceDesktop(opened, {
    type: 'open-winamp-panel',
    panel: 'player',
  })
  assert.equal(again.winampPanels, opened.winampPanels)
})

test('a plain launch restores winamp without resetting panels', () => {
  const state = run([
    { type: 'launch-winamp' },
    { type: 'close-winamp-panel', panel: 'equalizer' },
    { type: 'minimize', app: 'winamp' },
    { type: 'launch', app: 'winamp' },
  ])
  assert.deepEqual(state.apps.winamp, { open: true, minimized: false })
  assert.equal(state.winampPanels.equalizer, false)
})
