import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

const vars = await page.evaluate(() => {
  const fg = document.querySelector('[data-driving][class*="foreground"]')
  const style = fg ? getComputedStyle(fg) : null
  return {
    worldPan: style?.getPropertyValue('--fg-world-pan').trim(),
    nearPan: style?.getPropertyValue('--fg-near-pan').trim(),
    nearestPan: style?.getPropertyValue('--fg-nearest-pan').trim(),
    worldWidth: document.querySelector('[data-driving][class*="world"]')
      ?.getBoundingClientRect().width,
  }
})
console.log('vars', JSON.stringify(vars))

await page.getByRole('link', { name: 'Bazaar' }).tap()

const samples = []
for (let tick = 0; tick < 8; tick++) {
  await page.waitForTimeout(200)
  const sample = await page.evaluate(() => {
    const world = document.querySelector('[data-driving][class*="world"]')
    if (!world) return { url: location.pathname }
    const matrix = new DOMMatrixReadOnly(getComputedStyle(world).transform)
    return { url: location.pathname, worldX: Math.round(matrix.e) }
  })
  samples.push(sample)
  if (tick === 3) await page.screenshot({ path: '/tmp/home-ride-mid.png' })
}
console.log(JSON.stringify(samples, null, 1))

await browser.close()
