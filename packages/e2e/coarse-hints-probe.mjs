import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 834, height: 1112 },
  isMobile: true,
  hasTouch: true,
})

const visible = (el) => {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden'
}

const findByText = (text) =>
  [...document.querySelectorAll('span, p, b, kbd, div, li, dt')].find((el) =>
    el.textContent.includes(text) && el.children.length === 0,
  )

const checks = [
  ['/videoclub', 'SPACE PLAY', false],
  ['/games', 'Choose a game', false],
  ['/papers', 'ENTER READ', false],
  ['/papers', 'TAP A PAGE TO READ', true],
  ['/manual', '[ ] flip sheets', false],
  ['/snake', 'steer', false],
]

for (const [route, text, expectVisible] of checks) {
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const result = await page.evaluate(
    ([textArg, visSrc, findSrc]) => {
      const vis = eval(visSrc)
      const find = eval(findSrc)
      const el = find(textArg)
      return { found: Boolean(el), visible: vis(el) }
    },
    [text, `(${visible.toString()})`, `(${findByText.toString()})`],
  )
  const pass = result.visible === expectVisible
  console.log(pass ? 'PASS' : 'FAIL', route, JSON.stringify(text), result)
}

const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
console.log('pointer coarse emulated:', coarse)

await page.goto('http://localhost:3000/games', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/coarse-games.png' })
await page.goto('http://localhost:3000/videoclub', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/coarse-videoclub.png' })
await browser.close()
console.log('shots: /tmp/coarse-games.png /tmp/coarse-videoclub.png')
