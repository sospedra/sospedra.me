import { chromium, webkit } from '@playwright/test'

const tag = process.argv[2] ?? 'shot'
const browser = await (process.env.WK ? webkit : chromium).launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

await page.goto('http://localhost:3000/scavenger', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

const readLive = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('button[data-state]')]
      .filter((b) => !b.closest('[inert]'))
      .map((b) => {
        const r = b.getBoundingClientRect()
        return { label: b.getAttribute('aria-label'), x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }),
  )

let live = await readLive()
for (let retry = 0; live.length < 2 && retry < 4; retry += 1) {
  await page.evaluate(async () => {
    const opts = (y) => ({ clientX: 195, clientY: y, pointerId: 7, bubbles: true })
    window.dispatchEvent(new PointerEvent('pointerdown', opts(600)))
    await new Promise((r) => setTimeout(r, 120))
    window.dispatchEvent(new PointerEvent('pointerup', opts(450)))
  })
  await page.waitForTimeout(900)
  live = await readLive()
}

const bottom = live.sort((a, b) => a.y - b.y)[1]
console.log('tapping', bottom.label)
await page.touchscreen.tap(bottom.x, bottom.y)
await page.waitForTimeout(210)
await page.screenshot({ path: `/tmp/scav-eject-${tag}-mid.png` })
await page.waitForTimeout(120)
await page.screenshot({ path: `/tmp/scav-eject-${tag}-late.png` })
await browser.close()
console.log('saved', `/tmp/scav-eject-${tag}-mid.png`)
