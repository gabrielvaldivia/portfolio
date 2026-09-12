// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 2, `${label}: ${actual} != ${expected}`)
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.HERO_TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })
  const carousel = page.locator('.hero-mobile-carousel')
  const touch = await page.context().newCDPSession(page)
  const start = (y = 650) => touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y }] })
  const move = y => touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] })
  const end = () => touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const enter = async () => {
    await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
    await page.waitForTimeout(300)
    return page.evaluate(() => scrollY)
  }
  const drag = async (distance = 270, startY = 650) => {
    await start(startY)
    for (let step = 1; step <= 18; step++) {
      await move(startY - distance * step / 18)
      await page.waitForTimeout(16)
    }
  }
  const remaining = () => page.locator('.hero-approach-snap-point').evaluate(el => el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop))

  const heroY = await enter()
  await drag()
  near(await page.evaluate(() => scrollY), heroY + 270, 'exit follows the finger without added momentum')
  await end()
  const samples = await page.evaluate(async () => {
    const samples = [], start = performance.now()
    while (performance.now() - start < 750) {
      const el = document.querySelector('.hero-approach-snap-point')
      samples.push({ ms: performance.now() - start, remaining: el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop), y: scrollY })
      await new Promise(requestAnimationFrame)
    }
    return samples
  })
  const late = samples.filter(sample => sample.ms >= 350)
  assert.ok(late.length)
  late.forEach(sample => near(sample.remaining, 0, `settled without a late snap at ${Math.round(sample.ms)}ms`))
  assert.ok(samples.every((sample, index) => !index || sample.y >= samples[index - 1].y - 1), 'exit never reverses direction')
  console.log(`PASS: exit settles in ${Math.round(samples.find(sample => Math.abs(sample.remaining) < 2).ms)}ms with no slow tail or second snap`)

  await enter()
  await drag()
  await end()
  await page.waitForTimeout(70)
  await start(200)
  const stoppedY = await page.evaluate(() => scrollY)
  await page.waitForTimeout(300)
  near(await page.evaluate(() => scrollY), stoppedY, 'new touch immediately cancels the exit, even on the outgoing slide')
  for (let step = 1; step <= 10; step++) {
    await move(200 - step * 12)
    await page.waitForTimeout(16)
  }
  await end()
  await page.waitForTimeout(500)
  assert.ok(await page.evaluate(() => scrollY) > stoppedY + 60, 'interruption continues scrolling naturally')
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType), 'none')

  await enter()
  await drag()
  await end()
  await page.waitForTimeout(70)
  await start(500)
  for (let step = 1; step <= 16; step++) {
    await move(500 + step * 16)
    await page.waitForTimeout(16)
  }
  await end()
  await page.waitForTimeout(900)
  near(await page.evaluate(() => scrollY), heroY, 'reverse swipe interrupts and returns to the slideshow')

  // Browser toolbar changes cannot move the destination during an owned exit.
  await enter()
  await drag()
  const heightBefore = await carousel.evaluate(el => el.getBoundingClientRect().height)
  await page.evaluate(async () => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, value: 784 })
    visualViewport.dispatchEvent(new Event('resize'))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  near(await carousel.evaluate(el => el.getBoundingClientRect().height), heightBefore, 'exit locks carousel geometry during toolbar resize')
  await end()
  await page.waitForTimeout(350)
  near(await remaining(), 0, 'toolbar resize does not cause a final correction')
  await page.evaluate(() => { delete visualViewport.height; visualViewport.dispatchEvent(new Event('resize')) })

  await enter()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  await drag()
  await end()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  near(await remaining(), 0, 'reduced motion exits immediately')
  await touch.detach()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS: immediate touch cancellation, continued scrolling, reverse interruption, stable toolbar resize, reduced motion')
} finally {
  await browser.close()
}
