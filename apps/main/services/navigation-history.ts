const INTERNAL_BACK_KEY = '__sospedraInternalBack'

type StateRecord = Record<string, unknown>

const isStateRecord = (state: unknown): state is StateRecord =>
  typeof state === 'object' && state !== null

export const internalBackFromHistoryState = (
  state: unknown,
): boolean | null => {
  if (!isStateRecord(state)) return null
  const value = state[INTERNAL_BACK_KEY]
  return typeof value === 'boolean' ? value : null
}

const withInternalBack = (
  state: unknown,
  internalBack: boolean,
): StateRecord => ({
  ...(isStateRecord(state) ? state : {}),
  [INTERNAL_BACK_KEY]: internalBack,
})

const hasSameOriginReferrer = (referrer: string, origin: string): boolean => {
  if (referrer.length === 0) return false
  try {
    return new URL(referrer).origin === origin
  } catch {
    return false
  }
}

type BackNavigationSnapshot = {
  historyLength: number
  internalBack: boolean | null
  navigationCanGoBack: boolean | null
}

export const shouldNavigateBackWithinSite = ({
  historyLength,
  internalBack,
  navigationCanGoBack,
}: BackNavigationSnapshot): boolean => {
  if (navigationCanGoBack !== null) return navigationCanGoBack
  return historyLength > 1 && internalBack === true
}

export type SiteHistoryEnvironment = {
  history: Pick<History, 'length' | 'pushState' | 'replaceState' | 'state'>
  origin: string
  referrer: string
}

export const installSiteHistoryTracker = (
  environment: SiteHistoryEnvironment = {
    history: window.history,
    origin: window.location.origin,
    referrer: document.referrer,
  },
): (() => void) => {
  const { history, origin, referrer } = environment
  const initialInternalBack =
    internalBackFromHistoryState(history.state) ??
    (history.length > 1 && hasSameOriginReferrer(referrer, origin))
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  originalReplaceState.call(
    history,
    withInternalBack(history.state, initialInternalBack),
    '',
  )

  const trackedPushState: History['pushState'] = (data, unused, url) => {
    originalPushState.call(history, withInternalBack(data, true), unused, url)
  }
  const trackedReplaceState: History['replaceState'] = (data, unused, url) => {
    const internalBack =
      internalBackFromHistoryState(history.state) ?? initialInternalBack
    originalReplaceState.call(
      history,
      withInternalBack(data, internalBack),
      unused,
      url,
    )
  }

  history.pushState = trackedPushState
  history.replaceState = trackedReplaceState

  return () => {
    if (history.pushState === trackedPushState) {
      history.pushState = originalPushState
    }
    if (history.replaceState === trackedReplaceState) {
      history.replaceState = originalReplaceState
    }
  }
}

export const canGoBackWithinSite = (): boolean => {
  const navigation = (
    window as Window & { navigation?: { canGoBack?: unknown } }
  ).navigation
  return shouldNavigateBackWithinSite({
    historyLength: window.history.length,
    internalBack: internalBackFromHistoryState(window.history.state),
    navigationCanGoBack:
      typeof navigation?.canGoBack === 'boolean' ? navigation.canGoBack : null,
  })
}

export const navigateBackOrHome = (goHome: () => void): void => {
  if (canGoBackWithinSite()) {
    window.history.back()
    return
  }
  goHome()
}
