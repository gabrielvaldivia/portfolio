// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
const url = process.env.HERO_TEST_URL || 'http://localhost:3000'
const open = async (options = {}) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...options })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })
  return { page, errors }
}
const underNav = page => page.evaluate(() => document.documentElement.hasAttribute('data-hero-under-nav'))

try {
  const { page, errors } = await open()
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(300)
  assert.equal(await underNav(page), false, 'the menu keeps its page color above the hero')
  const carousel = page.locator('.hero-mobile-carousel')
  await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await page.waitForTimeout(400)
  assert.equal(await underNav(page), true, 'the full-screen hero turns the menu icon white')
  assert.equal(await page.locator('.mobile-site-nav .site-menu-toggle').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)')

  // Every frame, the slides the scroll position shows must be visible, through
  // rapid taps and swipes across both loop seams.
  await page.evaluate(() => {
    const track = document.querySelector('.hero-mobile-carousel')
    window.__cube = { frames: 0, turning: 0, blank: [] }
    const check = () => {
      const position = track.scrollLeft / track.clientWidth
      const slides = [...track.children]
      const shown = [Math.floor(position + 0.001), Math.ceil(position - 0.001)]
      if (shown.some(index => slides[index]?.style.visibility === 'hidden')) window.__cube.blank.push(position)
      if (slides.some(slide => slide.style.transform)) window.__cube.turning++
      window.__cube.frames++
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
  const touch = await page.context().newCDPSession(page)
  const tap = async x => {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 300 }] })
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const swipe = async direction => {
    const x = direction === 1 ? 340 : 45
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 300 }] })
    for (let step = 1; step <= 10; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - direction * 280 * step / 10, y: 300 }] })
      await page.waitForTimeout(16)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const count = await page.locator('.hero-mobile-pagination button').count()
  for (let step = 0; step <= count; step++) {
    await tap(300)
    await page.waitForTimeout(500)
  }
  for (let step = 0; step <= count; step++) {
    await tap(60)
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(800)
  for (const direction of [1, -1]) {
    for (let step = 0; step <= count; step++) await swipe(direction)
    await page.waitForTimeout(800)
  }
  await touch.detach()
  const cube = await page.evaluate(() => window.__cube)
  assert.ok(cube.turning > 20, `slides turn in 3D between pages: ${JSON.stringify(cube)}`)
  assert.deepEqual(cube.blank, [], 'no frame hides a slide the viewport shows, including loop jumps')
  const active = page.locator('.hero-mobile-slide[aria-hidden="false"]')
  assert.equal(await active.evaluate(el => el.style.transform), '', 'the settled slide is flat')
  assert.deepEqual(errors, [], 'no browser runtime errors')
  await page.close()

  const reduced = await open({ reducedMotion: 'reduce' })
  await reduced.page.locator('.hero-mobile-carousel').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await reduced.page.locator('.hero-mobile-pagination button').nth(1).click()
  await reduced.page.waitForTimeout(400)
  const transformed = await reduced.page.locator('.hero-mobile-carousel > *').evaluateAll(slides => slides.filter(slide => slide.style.transform || slide.style.visibility === 'hidden').length)
  assert.equal(transformed, 0, 'reduced motion keeps flat slides')
  assert.deepEqual(reduced.errors, [], 'no browser runtime errors with reduced motion')
  console.log('PASS: cube turns without blank frames, flat at rest and with reduced motion, white menu over the hero')
} finally {
  await browser.close()
}
