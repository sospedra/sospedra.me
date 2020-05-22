export * from './shake'

export const queryTouchScreen = '(hover: none)'
export const querySmScreen = '(min-width: 640px)'

export const matchScreen = (query: string) => {
  if (process.browser) {
    return window.matchMedia(query).matches
  } else {
    return false
  }
}
