import { test as base, expect, type Locator, type Page } from '@playwright/test'

export type PageHealth = {
  consoleErrors: string[]
  pageErrors: string[]
  failedSameOrigin: string[]
}

type Fixtures = {
  allowedHosts: string[]
  health: PageHealth
}

const LOCAL = new Set(['localhost', '127.0.0.1'])

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export const test = base.extend<Fixtures>({
  allowedHosts: [[], { option: true }],
  health: [
    async ({ page, allowedHosts }, use) => {
      const allowed = new Set([...LOCAL, ...allowedHosts])
      const health: PageHealth = {
        consoleErrors: [],
        pageErrors: [],
        failedSameOrigin: [],
      }
      // the dev-overlay badge floats over small viewports and eats taps
      await page.addInitScript(() => {
        const hide = () => {
          const style = document.createElement('style')
          style.textContent =
            'nextjs-portal { pointer-events: none !important; }'
          document.head?.append(style)
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', hide)
          return
        }
        hide()
      })
      await page.route('**/*', (route) => {
        const host = hostnameOf(route.request().url())
        if (allowed.has(host)) return route.continue()
        return route.abort()
      })
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        const source = hostnameOf(message.location().url)
        const external = source !== '' && !allowed.has(source)
        if (external) return
        if (isBlockedResourceNoise(message.text(), allowed)) return
        health.consoleErrors.push(message.text())
      })
      page.on('pageerror', (error) => health.pageErrors.push(String(error)))
      page.on('response', (response) => {
        const host = hostnameOf(response.url())
        if (!LOCAL.has(host)) return
        if (response.status() < 400) return
        health.failedSameOrigin.push(`${response.status()} ${response.url()}`)
      })
      await use(health)
    },
    { auto: true },
  ],
})

export { expect }

function isBlockedResourceNoise(text: string, allowed: Set<string>): boolean {
  if (!text.includes('Failed to load resource')) return false
  const [firstToken = ''] = text.split(' ')
  const host = hostnameOf(firstToken)
  return host === '' || !allowed.has(host)
}

export function expectClean(health: PageHealth): void {
  expect(health.pageErrors, 'uncaught page errors').toEqual([])
  expect(health.consoleErrors, 'console errors').toEqual([])
  expect(health.failedSameOrigin, 'failed same-origin requests').toEqual([])
}

export async function expectCanvasPainted(canvas: Locator): Promise<void> {
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas has no bounding box')
  const shot = await canvas.screenshot()
  // a flat canvas compresses to a fraction of this; a painted scene exceeds it
  expect(shot.byteLength).toBeGreaterThan((box.width * box.height) / 100)
}

// clicks at the scene corner until hydration lands one and the boot skips
export async function skipGamesBoot(page: Page): Promise<void> {
  const scene = page.locator('[data-phase]')
  await expect
    .poll(async () => {
      const phase = await scene.getAttribute('data-phase')
      if (phase !== 'ready') await page.mouse.click(10, 10)
      return phase
    })
    .toBe('ready')
}

type Point = { x: number; y: number }

export async function touchSwipe(
  page: Page,
  from: Point,
  to: Point,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  const steps = 8
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [from],
  })
  for (let index = 1; index <= steps; index += 1) {
    const x = from.x + ((to.x - from.x) * index) / steps
    const y = from.y + ((to.y - from.y) * index) / steps
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y }],
    })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await cdp.detach()
}
