// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.HERO_TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => document.fonts.ready)
  const carousel = page.locator('.hero-mobile-carousel')
  await carousel.waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await carousel.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
  const buttons = page.locator('.hero-mobile-pagination button')
  await buttons.first().click()
  await page.waitForTimeout(300)
  const count = await buttons.count()
  const selected = () => buttons.evaluateAll(els => els.findIndex(el => el.getAttribute('aria-current') === 'true'))
  const pageY = await page.evaluate(() => scrollY)
  for (const direction of [1, -1, -1, 1]) {
    const before = await selected()
    const from = direction === 1 ? 335 : 60
    const to = direction === 1 ? 60 : 335
    await page.mouse.move(from, 350)
    await page.mouse.down()
    await page.mouse.move(to, 350, { steps: 18 })
    await page.mouse.up()
    await page.waitForTimeout(350)
    assert.equal(await selected(), (before + direction + count) % count, 'drag changes slides in both directions and across the loop')
    assert.equal(new URL(page.url()).pathname, '/', 'drag does not open a project')
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - pageY) < 2, 'drag does not scroll the page vertically')
  }
  const activeLink = page.locator('.hero-mobile-slide[aria-hidden="false"] a[aria-label^="View "]')
  const href = await activeLink.getAttribute('href')
  await page.mouse.click(190, 350)
  await page.waitForURL(url => url.pathname === href)
  assert.deepEqual(errors, [], 'no browser errors')
  console.log('PASS: mobile pointer dragging both ways, looping, no accidental navigation, and ordinary project clicks')
} finally {
  await browser.close()
}
