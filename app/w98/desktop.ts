// Desktop window manager: which apps are open, minimized, and focused.
export type AppId = 'mines' | 'paint' | 'winamp' | 'realplayer'

export type AppWindowState = {
  open: boolean
  minimized: boolean
}

export type DesktopState = {
  active: AppId | null
  apps: Record<AppId, AppWindowState>
}

export type DesktopAction =
  | { type: 'launch'; app: AppId }
  | { type: 'activate'; app: AppId }
  | { type: 'minimize'; app: AppId }
  | { type: 'close'; app: AppId }

export const APP_IDS = ['mines', 'paint', 'winamp', 'realplayer'] as const

export const INITIAL_DESKTOP: DesktopState = {
  active: null,
  apps: {
    mines: { open: false, minimized: false },
    paint: { open: false, minimized: false },
    winamp: { open: false, minimized: false },
    realplayer: { open: false, minimized: false },
  },
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

export const reduceDesktop = (
  state: DesktopState,
  action: DesktopAction,
): DesktopState => {
  const current = state.apps[action.app]
  switch (action.type) {
    case 'launch':
      return {
        active: action.app,
        apps: {
          ...state.apps,
          [action.app]: { open: true, minimized: false },
        },
      }
    case 'activate':
      if (!current.open || current.minimized) return state
      return { ...state, active: action.app }
    case 'minimize': {
      if (!current.open || current.minimized) return state
      const apps = {
        ...state.apps,
        [action.app]: { ...current, minimized: true },
      }
      return {
        apps,
        active:
          state.active === action.app
            ? nextVisibleApp(apps, action.app)
            : state.active,
      }
    }
    case 'close': {
      if (!current.open) return state
      const apps = {
        ...state.apps,
        [action.app]: { open: false, minimized: false },
      }
      return {
        apps,
        active:
          state.active === action.app
            ? nextVisibleApp(apps, action.app)
            : state.active,
      }
    }
  }
}
