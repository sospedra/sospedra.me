import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForSelector('[data-car-state="parked"]', { timeout: 15000 })

await page.evaluate(() => {
  window.__timeline = []
  const record = () => {
    const last = window.__timeline.at(-1)
    const entry = {
      t: Math.round(performance.now()),
      body: getComputedStyle(document.body).backgroundColor,
      strip:
        document.querySelector('div[class*="toolbar-strip"]')?.style
          .backgroundColor ?? null,
      path: location.pathname,
    }
    const same =
      last &&
      last.body === entry.body &&
      last.strip === entry.strip &&
      last.path === entry.path
    if (!same) window.__timeline.push(entry)
    requestAnimationFrame(record)
  }
  record()
})

await page.click('a[href="/bazaar"]')
await page.waitForURL('**/bazaar', { timeout: 15000 })
await page.waitForTimeout(600)

const timeline = await page.evaluate(() => window.__timeline)
for (const entry of timeline) console.log(JSON.stringify(entry))

await browser.close()
