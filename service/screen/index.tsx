import getEventsMap from 'px-map-events'

export * from './shake'
export * from './useMeasure'

export const queryTouchScreen = '(hover: none)'
export const querySmScreen = '(min-width: 640px)'

export const matchScreen = (query: string) => {
  if (process.browser) {
    return window.matchMedia(query).matches
  } else {
    return false
  }
}

export const hasMotion = () => {
  const windowEventsMap = getEventsMap('window' as const)['window']
  return !!windowEventsMap.includes('devicemotion')
}
