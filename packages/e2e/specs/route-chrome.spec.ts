import { expect, test } from '../fixtures'
import { MAIN_ROUTES } from '../routes'

// Two invariants keep the iOS bar tints working without hurting the page.
// 1. The toolbar strip keeps a sliver of at most 4px inside the viewport.
//    iOS never samples a box with zero in-viewport pixels, and a deeper
//    sliver reads as a fixed line wherever the tint and the art disagree.
// 2. The overscroll shield rides the sky layer, so no route decor can sit
//    below it. A shield inside the route stacking context buries every
//    negative-z decor layer that escapes its own parent.
const probeChrome = () => {
  // properties whose computed default is the string 'none'
  const NONE_PROPS = [
    'transform',
    'filter',
    'perspective',
    'clipPath',
    'maskImage',
  ] as const

  const isStackingContext = (element: Element): boolean => {
    if (element === document.documentElement) return true
    const style = getComputedStyle(element)
    return [
      style.isolation === 'isolate',
      style.mixBlendMode !== 'normal',
      Number.parseFloat(style.opacity) < 1,
      style.willChange !== 'auto',
      style.contain !== 'none',
      style.containerType !== 'normal',
      NONE_PROPS.some((prop) => style[prop] !== 'none'),
      style.position !== 'static' && style.zIndex !== 'auto',
    ].some(Boolean)
  }

  const contextOf = (element: Element): Element | null => {
    let parent = element.parentElement
    while (parent) {
      if (isStackingContext(parent)) return parent
      parent = parent.parentElement
    }
    return null
  }

  const zOf = (element: Element | null) =>
    element ? Number.parseFloat(getComputedStyle(element).zIndex) : Number.NaN

  // routes may skip Shell, so anchor on the transition layer, not on #vbody
  const routeContext = document.querySelector<HTMLElement>(
    'div[class*="provider"]',
  )
  const shield = document.querySelector<HTMLElement>(
    'div[class*="overscrollShield"]',
  )
  return {
    // the deepest decor layer the route can reach, for the report only
    deepestRouteZ: Math.min(
      0,
      ...[...document.querySelectorAll<HTMLElement>('*')]
        .filter((el) => contextOf(el) === routeContext)
        .map((el) => zOf(el))
        .filter((z) => z < 0),
    ),
    hasLayers: routeContext !== null && shield !== null,
    sharesRouteContext: shield !== null && contextOf(shield) === routeContext,
    shieldZ: zOf(shield),
    routeZ: zOf(routeContext),
  }
}

// the strip carries a parked offset and a nudged one, so sampling a single
// frame verifies only whichever state the clock happens to land on
const SAMPLE_MS = 2500
const SAMPLE_STEP_MS = 100

const stripEdgeRange = async ([window, step]: [number, number]) => {
  const deadline = performance.now() + window
  let highest = Number.POSITIVE_INFINITY
  let lowest = Number.NEGATIVE_INFINITY
  while (performance.now() < deadline) {
    const strip = document.querySelector('div[class*="toolbar-strip"]')
    if (strip) {
      const top = strip.getBoundingClientRect().top
      highest = Math.min(highest, top)
      lowest = Math.max(lowest, top)
    }
    await new Promise((resolve) => setTimeout(resolve, step))
  }
  return { highest, lowest, viewportHeight: globalThis.innerHeight }
}

for (const route of MAIN_ROUTES) {
  test(`${route} keeps the bar chrome off the page`, async ({ page }) => {
    await page.goto(route)
    const strip = await page.evaluate(stripEdgeRange, [
      SAMPLE_MS,
      SAMPLE_STEP_MS,
    ] as [number, number])
    const chrome = await page.evaluate(probeChrome)

    expect(chrome.hasLayers, 'route layer and shield must both render').toBe(
      true,
    )
    expect(
      chrome.sharesRouteContext,
      'shield must not sit in the route stacking context',
    ).toBe(false)
    expect(
      chrome.routeZ,
      `route layer must outrank the shield (deepest decor z ${chrome.deepestRouteZ})`,
    ).toBeGreaterThan(chrome.shieldZ)
    if (strip.highest === Number.POSITIVE_INFINITY) return
    expect(
      strip.highest,
      'toolbar strip may reach at most 4px into the viewport',
    ).toBeGreaterThanOrEqual(strip.viewportHeight - 4)
    expect(
      strip.lowest,
      'toolbar strip must keep pixels inside the viewport; iOS ignores a fully-outside box',
    ).toBeLessThan(strip.viewportHeight)
  })
}
