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

  // Safari on iPhone runs CSS scroll snapping and native smooth scrolling in a
  // separate process, where they stopped slow swipes between slides. The
  // carousel must drive every movement itself.
  assert.equal(await carousel.evaluate(el => getComputedStyle(el).scrollSnapType), 'none', 'the carousel has no CSS scroll snapping')
  await page.evaluate(() => {
    window.__smoothScrolls = 0
    const scrollTo = Element.prototype.scrollTo
    Element.prototype.scrollTo = function (...args) {
      if (this.classList?.contains('hero-mobile-carousel') && args[0]?.behavior === 'smooth') window.__smoothScrolls++
      return scrollTo.apply(this, args)
    }
  })

  // Every frame, through rapid taps and slow swipes across both loop seams:
  // faces turn, while the slides themselves never transform or hide.
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
  // A vertical drag that interrupts a turn still lets it finish.
  const pageY = await page.evaluate(() => scrollY)
  await tap(300)
  await page.waitForTimeout(120)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 300 }] })
  for (const y of [320, 340, 360]) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] })
    await page.waitForTimeout(16)
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await restsOnSlide('a turn interrupted by a vertical drag finishes on a whole slide')
  await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), pageY)
  await touch.detach()
  const cube = await page.evaluate(() => window.__cube)
  assert.ok(cube.turning > 20, `faces turn in 3D between pages: ${JSON.stringify(cube)}`)
  assert.equal(cube.snapTransformed, 0, 'slides are never transformed; only their faces turn')
  assert.equal(await page.evaluate(() => window.__smoothScrolls), 0, 'the carousel never asks the browser for a smooth scroll')
  assert.equal(cube.hidden, 0, 'no slide is hidden, so a late style update can never show a gap')

  // Whatever stops a scroll between slides, the carousel finishes the turn.
  await carousel.evaluate(track => track.scrollTo({ left: track.scrollLeft + track.clientWidth * 0.45, behavior: 'instant' }))
  await restsOnSlide('a scroll stopped mid-turn settles on a whole slide')
  assert.deepEqual(errors, [], 'no browser runtime errors')
  await page.close()

  const reduced = await open({ reducedMotion: 'reduce' })
  await reduced.page.locator('.hero-mobile-carousel').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  // The progress lines appear once the carousel fills the screen; click them only then.
  await reduced.page.locator('.hero-mobile-pagination').waitFor({ state: 'visible' })
  await reduced.page.locator('.hero-mobile-pagination button').nth(1).click()
  await reduced.page.waitForTimeout(400)
  const transformed = await reduced.page.locator('.hero-mobile-face').evaluateAll(faces => faces.filter(face => face.style.transform).length)
  assert.equal(transformed, 0, 'reduced motion keeps flat slides')
  assert.deepEqual(reduced.errors, [], 'no browser runtime errors with reduced motion')
  console.log('PASS: carousel drives its own motion, faces turn while slides stay flat, slow drags and interrupted or stopped turns rest on a slide, reduced motion stays flat, white menu over the hero')
} finally {
  await browser.close()
}
