import type { WinampPanelId, WinampPanelVisibility } from './music/music-view'

export type AppId = 'mines' | 'paint' | 'winamp' | 'realplayer'

export type AppWindowState = {
  open: boolean
  minimized: boolean
}

export type DesktopState = {
  active: AppId | null
  apps: Record<AppId, AppWindowState>
  winampPanels: WinampPanelVisibility
}

export type DesktopAction =
  | { type: 'launch'; app: AppId }
  | { type: 'launch-winamp' }
  | { type: 'activate'; app: AppId }
  | { type: 'minimize'; app: AppId }
  | { type: 'close'; app: AppId }
  | { type: 'open-winamp-panel'; panel: WinampPanelId }
  | { type: 'close-winamp-panel'; panel: WinampPanelId }

export const APP_IDS = ['mines', 'paint', 'winamp', 'realplayer'] as const

const ALL_WINAMP_PANELS: WinampPanelVisibility = {
  equalizer: true,
  player: true,
  tracklist: true,
}

const NO_WINAMP_PANELS: WinampPanelVisibility = {
  equalizer: false,
  player: false,
  tracklist: false,
}

export const INITIAL_DESKTOP: DesktopState = {
  active: null,
  apps: {
    mines: { open: false, minimized: false },
    paint: { open: false, minimized: false },
    winamp: { open: false, minimized: false },
    realplayer: { open: false, minimized: false },
  },
  winampPanels: ALL_WINAMP_PANELS,
}

export const isAppId = (value: string): value is AppId =>
  (APP_IDS as readonly string[]).includes(value)

// deep link: /w98?sw=mines,winamp boots with those windows open
export const bootApps = (search: string): AppId[] => {
  const wanted = new URLSearchParams(search).get('sw') ?? ''
  return wanted.split(',').filter(isAppId)
}

export const nextVisibleApp = (
  apps: DesktopState['apps'],
  excluding: AppId,
): AppId | null =>
  APP_IDS.find(
    (app) => app !== excluding && apps[app].open && !apps[app].minimized,
  ) ?? null

const launch = (state: DesktopState, app: AppId): DesktopState => ({
  ...state,
  active: app,
  apps: { ...state.apps, [app]: { open: true, minimized: false } },
})

const minimize = (state: DesktopState, app: AppId): DesktopState => {
  const current = state.apps[app]
  if (!current.open || current.minimized) return state
  const apps = { ...state.apps, [app]: { ...current, minimized: true } }
  return {
    ...state,
    apps,
    active: state.active === app ? nextVisibleApp(apps, app) : state.active,
  }
}

const close = (state: DesktopState, app: AppId): DesktopState => {
  if (!state.apps[app].open) return state
  const apps = { ...state.apps, [app]: { open: false, minimized: false } }
  return {
    ...state,
    apps,
    active: state.active === app ? nextVisibleApp(apps, app) : state.active,
  }
}

export const reduceDesktop = (
  state: DesktopState,
  action: DesktopAction,
): DesktopState => {
  switch (action.type) {
    case 'launch':
      return launch(state, action.app)
    case 'launch-winamp':
      return { ...launch(state, 'winamp'), winampPanels: ALL_WINAMP_PANELS }
    case 'activate': {
      const current = state.apps[action.app]
      if (!current.open || current.minimized) return state
      return { ...state, active: action.app }
    }
    case 'minimize':
      return minimize(state, action.app)
    case 'close':
      return close(state, action.app)
    case 'open-winamp-panel':
      return {
        ...launch(state, 'winamp'),
        winampPanels: state.winampPanels[action.panel]
          ? state.winampPanels
          : { ...state.winampPanels, [action.panel]: true },
      }
    case 'close-winamp-panel': {
      if (action.panel === 'player') {
        return { ...close(state, 'winamp'), winampPanels: NO_WINAMP_PANELS }
      }
      return {
        ...state,
        winampPanels: { ...state.winampPanels, [action.panel]: false },
      }
    }
  }
}
