import { clamp } from 'es-toolkit'
import { prefersQuietFx } from 'services/theme'
import { VBODY_ID } from 'services/vbody'

const canScrollVertically = (element: HTMLElement) => {
  if (element.scrollHeight - element.clientHeight <= 1) return false
  const overflow = getComputedStyle(element).overflowY
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

const MAX_ANCESTOR_HOPS = 32

const findScrollableAncestor = (
  seed: HTMLElement | null,
  root: HTMLElement,
) => {
  let candidate = seed
  for (let hop = 0; candidate && hop < MAX_ANCESTOR_HOPS; hop += 1) {
    if (canScrollVertically(candidate)) return candidate
    if (candidate === root) break
    candidate = candidate.parentElement
  }
  return null
}

const surfaceFrom = (node: Element | null, root: HTMLElement) =>
  node instanceof HTMLElement && root.contains(node)
    ? findScrollableAncestor(node, root)
    : null

// the document scroller reports overflow-y visible, so the ancestor walk
// never returns it: probe its extent directly
const rootScrollSurface = () => {
  const root = document.scrollingElement
  if (!(root instanceof HTMLElement)) return null
  return root.scrollHeight - root.clientHeight > 1 ? root : null
}

const getActiveScrollSurface = () => {
  // shell-less scenes scroll their own <main> instead of the document
  const root =
    document.getElementById(VBODY_ID) ??
    document.querySelector<HTMLElement>('main')
  if (!root) return null

  return (
    surfaceFrom(document.activeElement, root) ??
    surfaceFrom(
      document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2),
      root,
    ) ??
    surfaceFrom(root, root) ??
    rootScrollSurface()
  )
}

const getScrollBehavior = (): ScrollBehavior =>
  prefersQuietFx() ? 'auto' : 'smooth'

const nearestSceneIndex = (scenes: HTMLElement[], surfaceTop: number) => {
  const distances = scenes.map((scene) =>
    Math.abs(scene.getBoundingClientRect().top - surfaceTop),
  )
  return distances.indexOf(Math.min(...distances))
}

// the document scroller's rect top is -scrollY; the visual reference is 0
const surfaceTopOf = (surface: HTMLElement) =>
  surface === document.scrollingElement
    ? 0
    : surface.getBoundingClientRect().top

// The Bazaar is a scene sequence, so j/k should select the next authored
// stage rather than land between rows with a generic percentage scroll.
const scrollSceneSequence = (
  scenes: HTMLElement[],
  direction: -1 | 1,
  surface: HTMLElement,
) => {
  const current = nearestSceneIndex(scenes, surfaceTopOf(surface))
  const next = clamp(current + direction, 0, scenes.length - 1)
  if (next === current) return false

  scenes[next]?.scrollIntoView({
    behavior: getScrollBehavior(),
    block: 'start',
  })
  return true
}

const PAGE_SCROLL_MIN_PX = 240
const PAGE_SCROLL_MAX_PX = 720
const PAGE_SCROLL_VIEWPORT_SHARE = 0.68

const scrollSurfaceByPage = (surface: HTMLElement, direction: -1 | 1) => {
  const atStart = surface.scrollTop <= 1
  const atEnd =
    surface.scrollTop + surface.clientHeight >= surface.scrollHeight - 1
  const atBoundary = direction === -1 ? atStart : atEnd
  if (atBoundary) return false

  const distance = clamp(
    Math.round(surface.clientHeight * PAGE_SCROLL_VIEWPORT_SHARE),
    PAGE_SCROLL_MIN_PX,
    PAGE_SCROLL_MAX_PX,
  )

  surface.scrollBy({ behavior: getScrollBehavior(), top: distance * direction })
  return true
}

export const scrollActivePage = (direction: -1 | 1) => {
  if (hasOpenModal()) return false

  const surface = getActiveScrollSurface()
  if (!surface) return false

  // responsive twins render both trees; only the displayed one has extent
  const marketScenes = Array.from(
    surface.querySelectorAll<HTMLElement>('[data-market-scene]'),
  ).filter((scene) => scene.getBoundingClientRect().height > 0)
  if (marketScenes.length > 1) {
    return scrollSceneSequence(marketScenes, direction, surface)
  }

  return scrollSurfaceByPage(surface, direction)
}

const hasOpenModal = () =>
  Boolean(document.querySelector('dialog[open], [aria-modal="true"]'))

export const scrollToPageEdge = (direction: -1 | 1) => {
  if (hasOpenModal()) return false

  const surface = getActiveScrollSurface()
  if (!surface) return false

  surface.scrollTo({
    behavior: getScrollBehavior(),
    top: direction === -1 ? 0 : surface.scrollHeight,
  })
  return true
}

// `[` / `]` on authored sequences (manual sheets): jump to the sibling
// element marked with the selector instead of a percentage scroll
export const scrollMarkedScene = (selector: string, direction: -1 | 1) => {
  if (hasOpenModal()) return false

  const surface = getActiveScrollSurface()
  if (!surface) return false

  const scenes = Array.from(surface.querySelectorAll<HTMLElement>(selector))
  if (scenes.length < 2) return false
  return scrollSceneSequence(scenes, direction, surface)
}
