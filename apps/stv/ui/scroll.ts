export const NOW_ANCHOR_ID = 'now-anchor'

const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const scrollToNow = (): void => {
  document.getElementById(NOW_ANCHOR_ID)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
    inline: 'center',
  })
}
