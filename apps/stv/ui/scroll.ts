export const NOW_ANCHOR_ID = 'now-anchor'

const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const scrollNowIntoView = (behavior: ScrollBehavior): void => {
  document.getElementById(NOW_ANCHOR_ID)?.scrollIntoView({
    behavior,
    block: 'center',
    inline: 'center',
  })
}

export const jumpToNow = (): void => {
  scrollNowIntoView('auto')
}

export const scrollToNow = (): void => {
  scrollNowIntoView(prefersReducedMotion() ? 'auto' : 'smooth')
}
