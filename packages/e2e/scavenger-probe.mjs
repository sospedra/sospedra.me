import { chromium, webkit } from '@playwright/test'

const browser = await (process.env.WK ? webkit : chromium).launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

page.on('console', (msg) => console.log('[page]', msg.text()))

await page.goto('http://localhost:3000/scavenger', { waitUntil: 'networkidle' })

await page.evaluate(() => {
  window.__log = []
  const describe = (el) => {
    if (!(el instanceof Element)) return String(el)
    const label = el.getAttribute?.('aria-label') ?? ''
    const inert = el.closest?.('[inert]') ? ' INERT' : ''
    return `${el.tagName.toLowerCase()}.${(el.className ?? '').toString().slice(0, 40)}[${label}]${inert}`
  }
  for (const type of ['pointerdown', 'pointerup', 'click']) {
    window.addEventListener(
      type,
      (e) => window.__log.push(`${type} -> ${describe(e.target)} @${Math.round(e.clientX)},${Math.round(e.clientY)}`),
      true,
    )
  }
})

// let the boot finish
await page.waitForTimeout(2600)

const snapshot = () =>
  page.evaluate(() => {
    const counter = document.querySelector('p[aria-hidden]')?.textContent
    const card = document.getElementById('scavenger-liner')
    const buttons = [...document.querySelectorAll('button[aria-label]')]
      .filter((b) => b.className.includes('hit'))
      .map((b) => {
        const r = b.getBoundingClientRect()
        return {
          label: b.getAttribute('aria-label'),
          inert: Boolean(b.closest('[inert]')),
          rect: [r.left, r.top, r.width, r.height].map(Math.round),
        }
      })
    return { counter, cardTitle: card?.querySelector('h2')?.textContent ?? null, buttons }
  })

console.log('=== after boot', JSON.stringify(await snapshot(), null, 1))

// swipe up -> next spread (two CDs visible)
await page.touchscreen.tap(195, 700) // skip-proof no-op tap zone? no: taps may act. use swipe only
await page.waitForTimeout(700)
const swipeUp = async () => {
  await page.evaluate(() => window.__log.push('--- swipe up ---'))
  // synthesize a drag: pointerdown at y=600, pointerup at y=450
  await page.evaluate(async () => {
    const opts = (y) => ({ clientX: 195, clientY: y, pointerId: 7, bubbles: true })
    window.dispatchEvent(new PointerEvent('pointerdown', opts(600)))
    await new Promise((r) => setTimeout(r, 120))
    window.dispatchEvent(new PointerEvent('pointerup', opts(450)))
  })
}
await swipeUp()
await page.waitForTimeout(900)
console.log('=== after swipe', JSON.stringify(await snapshot(), null, 1))

const tapReport = async (name, x, y) => {
  await page.evaluate((label) => window.__log.push(`--- tap ${label} ---`), name)
  await page.touchscreen.tap(x, y)
  await page.waitForTimeout(1200)
  const snap = await snapshot()
  console.log(`=== after tap ${name}`, JSON.stringify(snap, null, 1))
  return snap
}

// live (non-inert) buttons after the swipe tell us where to aim
const live = (await snapshot()).buttons.filter((b) => !b.inert)
console.log('live buttons:', JSON.stringify(live))
const center = (b) => [b.rect[0] + b.rect[2] / 2, b.rect[1] + b.rect[3] / 2]
const byTop = [...live].sort((a, b) => a.rect[1] - b.rect[1])

if (byTop[0]) {
  const [x, y] = center(byTop[0])
  const snap = await tapReport(`TOP (${byTop[0].label})`, x, y)
  if (snap.cardTitle) {
    // tap away to put it back
    await page.touchscreen.tap(20, 100)
    await page.waitForTimeout(1400)
  }
}
if (byTop[1]) {
  const [x, y] = center(byTop[1])
  await tapReport(`BOTTOM (${byTop[1].label})`, x, y)
}

console.log('=== event log ===')
console.log((await page.evaluate(() => window.__log)).join('\n'))
await browser.close()
