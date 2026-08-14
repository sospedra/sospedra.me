import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForSelector('[data-car-state="parked"]', { timeout: 15000 })

const duration = await page.evaluate(() => {
  const dock = document.querySelector('[data-journey-car]')
  return Number(dock?.getAttribute('data-drive-duration-ms') ?? 0)
})

await page.click('a[href="/bazaar"]')
await page.waitForSelector('[data-driving="true"]', { timeout: 5000 })

const start = Date.now()
for (const pct of [44, 50, 56, 62]) {
  const wait = (duration * pct) / 100 - (Date.now() - start)
  if (wait > 0) await page.waitForTimeout(wait)
  await page.screenshot({ path: `/tmp/fixed-${pct}.png` })
}

await browser.close()
