import getEventsMap from 'px-map-events'

export * from './shake'
export * from './useMeasure'

export const queryTouchScreen = '(hover: none)'
export const querySmScreen = '(min-width: 640px)'

export const matchScreen = (query: string) => {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

export const hasMotion = () => {
  const windowEventsMap = getEventsMap('window' as const)['window']
  return !!windowEventsMap.includes('devicemotion')
}
