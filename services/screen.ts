export const queryTouchScreen = '(hover: none)'
export const querySmScreen = '(min-width: 640px)'

export const matchScreen = (query: string) => {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

export const hasMotion = () => {
  return typeof window !== 'undefined' && 'ondevicemotion' in window
}
