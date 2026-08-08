import assert from 'node:assert/strict'
import test from 'node:test'
import {
  installSiteHistoryTracker,
  internalBackFromHistoryState,
  type SiteHistoryEnvironment,
  shouldNavigateBackWithinSite,
} from './navigation-history.ts'

const createEnvironment = (
  initialState: Record<string, unknown> = { __NA: true },
  options: { historyLength?: number; referrer?: string } = {},
) => {
  let state = initialState
  const history: SiteHistoryEnvironment['history'] = {
    length: options.historyLength ?? 2,
    get state() {
      return state
    },
    pushState(data) {
      state = data
    },
    replaceState(data) {
      state = data
    },
  }
  return {
    environment: {
      history,
      origin: 'https://sospedra.me',
      referrer: options.referrer ?? '',
    },
    history,
  }
}

test('direct entries are marked as the site history boundary', () => {
  const { environment, history } = createEnvironment()
  installSiteHistoryTracker(environment)
  assert.equal(internalBackFromHistoryState(history.state), false)
})

test('an initial same-origin navigation is marked as internal', () => {
  const { environment, history } = createEnvironment(undefined, {
    referrer: 'https://sospedra.me/papers',
  })
  installSiteHistoryTracker(environment)
  assert.equal(internalBackFromHistoryState(history.state), true)
})

test('a same-origin referrer in a new tab has no back entry', () => {
  const { environment, history } = createEnvironment(undefined, {
    historyLength: 1,
    referrer: 'https://sospedra.me/',
  })
  installSiteHistoryTracker(environment)
  assert.equal(internalBackFromHistoryState(history.state), false)
})

test('an external or malformed referrer stays at the site boundary', () => {
  for (const referrer of ['https://example.com/search', 'not a url']) {
    const { environment, history } = createEnvironment(undefined, {
      referrer,
    })
    installSiteHistoryTracker(environment)
    assert.equal(internalBackFromHistoryState(history.state), false)
  }
})

test('push creates an entry with an internal predecessor', () => {
  const { environment, history } = createEnvironment()
  installSiteHistoryTracker(environment)
  history.pushState({ __NA: true }, '', '/camera')
  assert.equal(internalBackFromHistoryState(history.state), true)
})

test('replace preserves the current entry boundary marker', () => {
  const { environment, history } = createEnvironment()
  installSiteHistoryTracker(environment)
  history.replaceState({ __NA: true }, '', '/about')
  assert.equal(internalBackFromHistoryState(history.state), false)

  history.pushState({ __NA: true }, '', '/camera')
  history.replaceState({ __NA: true }, '', '/camera?mode=still')
  assert.equal(internalBackFromHistoryState(history.state), true)
})

test('an existing marker survives reload initialization', () => {
  for (const internalBack of [false, true]) {
    const { environment, history } = createEnvironment({
      __NA: true,
      __sospedraInternalBack: internalBack,
    })
    installSiteHistoryTracker(environment)
    assert.equal(internalBackFromHistoryState(history.state), internalBack)
  }
})

test('cleanup restores captured history methods without clobbering others', () => {
  const { environment, history } = createEnvironment()
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  const uninstall = installSiteHistoryTracker(environment)

  uninstall()
  assert.equal(history.pushState, originalPushState)
  assert.equal(history.replaceState, originalReplaceState)

  const second = installSiteHistoryTracker(environment)
  const replacement: History['pushState'] = () => {}
  history.pushState = replacement
  second()
  assert.equal(history.pushState, replacement)
})

test('back requires both a tracked internal entry and usable history', () => {
  assert.equal(
    shouldNavigateBackWithinSite({
      historyLength: 2,
      internalBack: true,
      navigationCanGoBack: null,
    }),
    true,
  )
  assert.equal(
    shouldNavigateBackWithinSite({
      historyLength: 2,
      internalBack: false,
      navigationCanGoBack: null,
    }),
    false,
  )
  assert.equal(
    shouldNavigateBackWithinSite({
      historyLength: 2,
      internalBack: null,
      navigationCanGoBack: null,
    }),
    false,
  )
  assert.equal(
    shouldNavigateBackWithinSite({
      historyLength: 1,
      internalBack: true,
      navigationCanGoBack: null,
    }),
    false,
  )
})

test('Navigation API is authoritative when the browser provides it', () => {
  assert.equal(
    shouldNavigateBackWithinSite({
      historyLength: 4,
      internalBack: true,
      navigationCanGoBack: false,
    }),
    false,
  )
  assert.equal(
    shouldNavigateBackWithinSite({
      historyLength: 1,
      internalBack: false,
      navigationCanGoBack: true,
    }),
    true,
  )
})
