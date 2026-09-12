// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.HERO_TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })
  const carousel = page.locator('.hero-mobile-carousel')
  const buttons = page.locator('.hero-mobile-pagination button')
  const count = await buttons.count()
  const touch = await page.context().newCDPSession(page)
  const swipe = async direction => {
    const x = direction === 1 ? 340 : 45
    const before = await carousel.evaluate(el => el.scrollLeft / el.clientWidth)
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 350 }] })
    for (let step = 1; step <= 12; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - direction * 290 * step / 12, y: 350 }] })
      await page.waitForTimeout(16)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const after = await carousel.evaluate(el => el.scrollLeft / el.clientWidth)
    const distance = ((after - before) * direction + count) % count
    assert.ok(distance > 0.5 && distance < 1.3,
      `every rapid swipe moves through the loop without hitting an edge: ${JSON.stringify({ direction, before, after, distance })}`)
  }
  const select = async index => {
    await buttons.nth(index).click()
    await page.waitForFunction(index => {
      const track = document.querySelector('.hero-mobile-carousel')
      return Math.abs(track.scrollLeft - (index + 1) * track.clientWidth) < 2
    }, index)
    await page.waitForTimeout(200)
  }
  await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await page.waitForTimeout(300)
  const heroY = await page.evaluate(() => scrollY)
  for (const direction of [1, -1]) {
    await select(direction === 1 ? count - 1 : 0)
    // Keep swiping through two full loops without waiting for momentum/snap.
    for (let step = 0; step < count * 2 + 2; step++) await swipe(direction)
    await page.waitForTimeout(800)
    const state = await carousel.evaluate(el => ({ left: el.scrollLeft, width: el.clientWidth }))
    const selected = await buttons.evaluateAll(elements => elements.findIndex(el => el.getAttribute('aria-current') === 'true'))
    assert.ok(Math.abs(state.left - (selected + 1) * state.width) < 2, 'finishes aligned to the selected real slide')
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - heroY) < 2, 'rapid loops preserve the page position')
  }
  await touch.detach()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS: immediate consecutive swipes continue across both loop boundaries')
} finally {
  await browser.close()
}
