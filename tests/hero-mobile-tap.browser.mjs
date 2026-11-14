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
  await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  // The progress lines appear once the carousel fills the screen; click them only then.
  await page.locator('.hero-mobile-pagination').waitFor({ state: 'visible' })
  await page.waitForTimeout(300)
  const buttons = page.locator('.hero-mobile-pagination button')
  const count = await buttons.count()
  const selected = () => buttons.evaluateAll(els => els.findIndex(el => el.getAttribute('aria-current') === 'true'))
  const aligned = () => carousel.evaluate(el => Math.abs(el.scrollLeft - Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth) < 2)
  const touch = await page.context().newCDPSession(page)
  const tap = async (x, y) => {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const settle = () => page.waitForTimeout(900)

  await buttons.first().click()
  await settle()
  await tap(300, 300)
  await settle()
  assert.equal(await selected(), 1 % count, 'tapping the right half shows the next slide')
  await tap(80, 300)
  await settle()
  assert.equal(await selected(), 0, 'tapping the left half shows the previous slide')
  await tap(80, 300)
  await settle()
  assert.equal(await selected(), count - 1, 'tapping back from the first slide loops to the last')
  assert.ok(await aligned(), 'loops finish aligned to a real slide')
  await tap(300, 300)
  await page.waitForTimeout(120)
  await tap(300, 300)
  await settle()
  assert.equal(await selected(), 1 % count, 'quick taps keep advancing, across the loop')

  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 500 }] })
  for (const y of [480, 460, 440, 460, 480, 500]) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y }] })
    await page.waitForTimeout(16)
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await settle()
  assert.equal(await selected(), 1 % count, 'a vertical drag does not turn the page')
  assert.equal(new URL(page.url()).pathname, '/', 'page-turn taps do not open a project')

  const projectLink = page.locator('.hero-mobile-slide[aria-hidden="false"] a[href^="/work/"]')
  const href = await projectLink.getAttribute('href')
  const box = await projectLink.boundingBox()
  await tap(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForURL(url => url.pathname === href)
  await touch.detach()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS: mobile taps turn pages by half, loop, and leave the project button working')
} finally {
  await browser.close()
}
