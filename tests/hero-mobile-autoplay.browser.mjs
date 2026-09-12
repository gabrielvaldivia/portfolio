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
  const currentIndex = () => buttons.evaluateAll(elements => elements.findIndex(el => el.getAttribute('aria-current') === 'true'))
  const checkSelected = index => page.waitForFunction(index => {
    const track = document.querySelector('.hero-mobile-carousel')
    return Math.abs(track.scrollLeft - (index + 1) * track.clientWidth) < 2
      && document.querySelectorAll('.hero-mobile-pagination button')[index].getAttribute('aria-current') === 'true'
  }, index, { timeout: 8500 })
  assert.equal(await page.evaluate(() => scrollY), 0, 'starts at the homepage intro')
  assert.equal(await page.locator('.hero-mobile-pagination').isVisible(), true, 'pagination lines are visible at the intro')
  let selected = await currentIndex()
  selected = (selected + 1) % count
  await checkSelected(selected)
  assert.equal(await page.evaluate(() => scrollY), 0, 'autoplay runs at the top without scrolling the page')
  console.log('PASS: mobile autoplay and pagination work at the top of the homepage')
  await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await page.waitForTimeout(500)
  const heroY = await page.evaluate(() => scrollY)
  selected = await currentIndex()
  for (let step = 0; step < count + 1; step++) {
    selected = (selected + 1) % count
    await checkSelected(selected)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - heroY) < 2, 'autoplay never moves the document')
  }
  console.log('PASS: six-second mobile autoplay advances through a full loop')

  const touch = await page.context().newCDPSession(page)
  const swipe = async (x, y, dx, dy) => {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let step = 1; step <= 18; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 18, y: y + dy * step / 18 }] })
      await page.waitForTimeout(16)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await swipe(340, 350, -290, 0)
  selected = (selected + 1) % count
  await checkSelected(selected)
  await page.waitForTimeout(7000)
  assert.equal(await currentIndex(), selected, 'manual swipe stops autoplay beyond the next interval')

  // Interrupt a snap while Approach is entering, before it reaches its final position.
  await page.locator('.hero-approach-snap-point').evaluate(el => el.scrollIntoView({ behavior: 'smooth' }))
  await page.waitForFunction(() => {
    const top = document.querySelector('.hero-approach-snap-point').getBoundingClientRect().top
    return top > 120 && top < 650
  }, undefined, { polling: 'raf' })
  assert.equal(await page.evaluate(() => Boolean(document.elementFromPoint(190, 760)?.closest('.hero-approach-snap-point'))), true, 'new swipe begins on the incoming Approach section')
  await swipe(190, 760, 0, -550)
  await page.waitForTimeout(800)
  const approach = await page.locator('.hero-approach-snap-point').evaluate(el => ({ top: el.getBoundingClientRect().top, snap: getComputedStyle(document.documentElement).scrollSnapType }))
  assert.equal(approach.snap, 'none', 'second swipe interrupts the pending snap')
  assert.ok(approach.top < -100, `second swipe continues down through Approach: ${approach.top}`)
  await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await page.waitForTimeout(7000)
  assert.equal(await currentIndex(), selected, 'manual pause persists after leaving and returning')
  assert.match(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType), /mandatory/, 'returning to the hero restores vertical pagination')
  await touch.detach()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS: manual swipe stops autoplay, Approach snapping is interruptible, returning keeps autoplay paused')
} finally {
  await browser.close()
}
