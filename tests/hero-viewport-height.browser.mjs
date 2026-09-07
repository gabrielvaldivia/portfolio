// Requires Playwright with WebKit installed. Optional overrides:
// HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_ENGINE, BROWSER_EXECUTABLE.
// Run: node tests/hero-viewport-height.browser.mjs
import assert from 'node:assert/strict'

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.BROWSER_ENGINE || 'webkit'
const browser = await engines[engine].launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.HERO_TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })

  const snapshot = () => page.evaluate(() => ({
    scrollY,
    heights: [...document.querySelectorAll('.hero-mobile-slide')].map(el => el.getBoundingClientRect().height),
    approachTop: document.querySelector('.hero-approach-snap-point').getBoundingClientRect().top + scrollY,
    workTop: document.querySelector('.liked-work-marquee').getBoundingClientRect().top + scrollY,
    snap: getComputedStyle(document.documentElement).scrollSnapType,
  }))
  const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1, `${label}: ${actual} != ${expected}`)
  const settle = () => page.waitForTimeout(700)

  // In the slideshow, each page follows the browser's visible height. Native
  // snapping must preserve the selected slide. Off-screen pages keep their
  // heights so they cannot move the selected slide's snap position.
  const slideElements = page.locator('.hero-mobile-slide')
  for (let index = 0; index < await slideElements.count(); index++) {
    await slideElements.nth(index).evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
    await settle()
    const beforeResize = await snapshot()
    for (const height of [784, 744, 844]) {
      await page.setViewportSize({ width: 390, height })
      await settle()
      ;(await snapshot()).heights.forEach((value, slideIndex) => near(value,
        slideIndex === index ? height : beforeResize.heights[slideIndex],
        slideIndex === index ? 'active slideshow height' : 'off-screen slide remains frozen'))
      const bounds = await slideElements.nth(index).boundingBox()
      near(bounds.y, 0, `slide ${index + 1} stays snapped after viewport resize`)
      near(bounds.height, height, `slide ${index + 1} fills viewport`)
    }
  }

  // Some mobile browsers update dvh without sending a window resize event.
  // Change only the measuring probe to exercise that ResizeObserver path.
  await page.locator('.hero-project-scroll-region > [aria-hidden="true"]').evaluate(el => {
    el.style.height = '804px'
  })
  await settle()
  near((await snapshot()).heights.at(-1), 804, 'dynamic viewport probe resize')
  await page.locator('.hero-project-scroll-region > [aria-hidden="true"]').evaluate(el => {
    el.style.removeProperty('height')
  })
  await settle()

  // Enter free scroll using the actual Approach boundary before reaching Work.
  await page.locator('.hero-approach-snap-point').evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
  await settle()
  await page.mouse.move(190, 400)
  await page.mouse.wheel(0, 650)
  await settle()
  await page.locator('.liked-work-marquee').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }))
  await settle()
  const start = await snapshot()
  assert.equal(start.snap, 'none', 'Work must use free scroll')

  // Model a browser resizing its entire webview as the toolbar animates.
  // Neither document geometry nor scroll position should need compensation.
  for (const height of [834, 814, 794, 784, 794, 814, 834, 844]) {
    await page.setViewportSize({ width: 390, height })
    await page.waitForTimeout(100)
    const next = await snapshot()
    next.heights.forEach((value, index) => near(value, start.heights[index], 'slide height'))
    near(next.approachTop, start.approachTop, 'Approach document position')
    near(next.workTop, start.workTop, 'Work document position')
    near(next.scrollY, start.scrollY, 'scroll position')
    assert.equal(next.snap, 'none')
  }

  // Still accommodate the visible toolbar without moving the page geometry.
  await page.setViewportSize({ width: 390, height: 784 })
  await settle()
  const arrowBottomInset = await page.locator('.hero-mobile-slide a[aria-label^="Open"]').first()
    .evaluate(el => Number.parseFloat(getComputedStyle(el).bottom))
  near(arrowBottomInset, start.heights[0] - 784 + 20, 'visible arrow bottom inset')

  // Returning to the slideshow refreshes a height that was frozen at Work,
  // even when there is no new resize event during the return gesture.
  await slideElements.last().evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
  await settle()
  near((await snapshot()).heights.at(-1), 784, 're-entry refreshes height')
  near((await slideElements.last().boundingBox()).y, 0, 're-entry keeps the final slide snapped')
  await page.locator('.hero-approach-snap-point').evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
  await settle()
  await page.mouse.wheel(0, 650)
  await settle()
  await page.locator('.liked-work-marquee').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }))
  await settle()

  // A real width change must remeasure; height-only changes after it must not.
  await page.setViewportSize({ width: 430, height: 784 })
  await settle()
  ;(await snapshot()).heights.forEach(height => near(height, 784, 'width change remeasurement'))
  await page.setViewportSize({ width: 430, height: 744 })
  await settle()
  ;(await snapshot()).heights.forEach(height => near(height, 784, 'new width remains locked'))

  // Rotation into desktop clears the mobile lock, then portrait captures anew.
  await page.setViewportSize({ width: 844, height: 390 })
  await settle()
  const desktop = await page.locator('.hero-project-scroll-region').evaluate(el => ({
    lock: el.style.getPropertyValue('--hero-mobile-height'),
    mobileHidden: getComputedStyle(el.querySelector('.hero-mobile-slide').parentElement.parentElement).display === 'none',
  }))
  assert.equal(desktop.lock, '')
  assert.equal(desktop.mobileHidden, true)
  await page.setViewportSize({ width: 390, height: 844 })
  await settle()
  ;(await snapshot()).heights.forEach(height => near(height, 844, 'portrait remeasurement'))

  // Native pagination still settles at actual slide starts, then releases down
  // from Approach and re-enters when returning to the final slide.
  await page.locator('.hero-project-snap-point').last().evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
  await settle()
  assert.match((await snapshot()).snap, /mandatory/)
  if (engine === 'chromium') {
    // Chromium treats short mouse-wheel ticks differently from phone swipes.
    const touch = await page.context().newCDPSession(page)
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 700 }] })
    for (let step = 1; step <= 18; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 700 - step * 30 }] })
      await page.waitForTimeout(16)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await touch.detach()
  } else {
    await page.mouse.wheel(0, 180)
  }
  await page.waitForFunction(() => {
    const el = document.querySelector('.hero-approach-snap-point')
    return Math.abs(el.getBoundingClientRect().top - Number.parseFloat(getComputedStyle(el).scrollMarginTop)) < 1
  }, undefined, { timeout: 5000 })
  const approach = await page.locator('.hero-approach-snap-point').evaluate(el => ({
    top: el.getBoundingClientRect().top,
    margin: Number.parseFloat(getComputedStyle(el).scrollMarginTop),
  }))
  near(approach.top, approach.margin, 'last slide paginates to Approach')
  await page.mouse.wheel(0, 180)
  await settle()
  assert.equal((await snapshot()).snap, 'none', 'Approach releases downward scrolling')
  await page.mouse.wheel(0, -1500)
  await settle()
  assert.match((await snapshot()).snap, /mandatory/, 'return to slideshow re-enables pagination')
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log(JSON.stringify({ engine, result: 'PASS', checks: ['active viewport resize', 'slide alignment', 'dynamic viewport probe', 'stable off-screen resize', 're-entry refresh', 'visible captions', 'width change', 'rotation', 'Approach handoff'] }))
} finally {
  await browser.close()
}
