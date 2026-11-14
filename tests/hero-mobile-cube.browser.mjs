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

  // Every frame, through rapid taps and slow swipes across both loop seams:
  // faces turn, while the slides (the scroll-snap targets) never transform.
  // Safari derives snap points from transformed boxes, so a transformed slide
  // creates false snap points where the carousel can rest mid-turn.
  await page.evaluate(() => {
    const track = document.querySelector('.hero-mobile-carousel')
    window.__cube = { frames: 0, turning: 0, snapTransformed: 0, hidden: 0 }
    const check = () => {
      const slides = [...track.children]
      if (slides.some(slide => slide.style.transform || getComputedStyle(slide).transform !== 'none')) window.__cube.snapTransformed++
      if (slides.some(slide => slide.style.visibility === 'hidden' || slide.firstElementChild?.style.visibility === 'hidden')) window.__cube.hidden++
      if (slides.some(slide => slide.querySelector(':scope > .hero-mobile-face')?.style.transform)) window.__cube.turning++
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
  const swipe = async (direction, distance = 280, steps = 10) => {
    const x = direction === 1 ? 340 : 45
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 300 }] })
    for (let step = 1; step <= steps; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - direction * distance * step / steps, y: 300 }] })
      await page.waitForTimeout(16)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const restsOnSlide = async label => {
    await page.waitForTimeout(900)
    const state = await carousel.evaluate(track => ({
      position: track.scrollLeft / track.clientWidth,
      turned: [...track.querySelectorAll('.hero-mobile-face')].filter(face => face.style.transform).length,
    }))
    assert.ok(Math.abs(state.position - Math.round(state.position)) < 0.01 && state.turned === 0, `${label}: ${JSON.stringify(state)}`)
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
  // Slow drags released anywhere from just short of halfway to most of the way.
  for (const distance of [120, 175, 195, 215, 260]) {
    await swipe(1, distance, 40)
    await restsOnSlide(`a slow ${distance}px drag comes to rest on a whole slide, flat`)
  }
  await touch.detach()
  const cube = await page.evaluate(() => window.__cube)
  assert.ok(cube.turning > 20, `faces turn in 3D between pages: ${JSON.stringify(cube)}`)
  assert.equal(cube.snapTransformed, 0, 'scroll-snap slides are never transformed')
  assert.equal(cube.hidden, 0, 'no slide is hidden, so a late style update can never show a gap')

  // Whatever stops a scroll between slides, the carousel finishes the turn.
  await page.addStyleTag({ content: '.hero-mobile-carousel { scroll-snap-type: none !important }' })
  await carousel.evaluate(track => track.scrollTo({ left: track.scrollLeft + track.clientWidth * 0.45, behavior: 'instant' }))
  await restsOnSlide('a scroll stopped mid-turn settles on a whole slide')
  assert.deepEqual(errors, [], 'no browser runtime errors')
  await page.close()

  const reduced = await open({ reducedMotion: 'reduce' })
  await reduced.page.locator('.hero-mobile-carousel').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await reduced.page.locator('.hero-mobile-pagination button').nth(1).click()
  await reduced.page.waitForTimeout(400)
  const transformed = await reduced.page.locator('.hero-mobile-face').evaluateAll(faces => faces.filter(face => face.style.transform).length)
  assert.equal(transformed, 0, 'reduced motion keeps flat slides')
  assert.deepEqual(reduced.errors, [], 'no browser runtime errors with reduced motion')
  console.log('PASS: faces turn while snap targets stay flat, slow drags and stopped scrolls rest on a slide, reduced motion stays flat, white menu over the hero')
} finally {
  await browser.close()
}
