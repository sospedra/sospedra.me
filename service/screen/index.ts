export const query = '(hover: none)'

export const matchScreen = () => {
  return window.matchMedia(query).matches
}
