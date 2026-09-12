// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  headless: true,
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
  const slides = page.locator('.hero-mobile-slide')
  const pagination = page.locator('.hero-mobile-pagination')
  const buttons = pagination.locator('button')
  const touch = await page.context().newCDPSession(page)
  const settle = () => page.waitForTimeout(800)
  const swipe = async (x, y, dx, dy) => {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let step = 1; step <= 18; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 18, y: y + dy * step / 18 }] })
      await page.waitForTimeout(16)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await settle()
  }
  const checkSelected = async index => {
    await page.waitForFunction(index => {
      const track = document.querySelector('.hero-mobile-carousel')
      return Math.abs(track.scrollLeft - (index + 1) * track.clientWidth) < 2
        && document.querySelectorAll('.hero-mobile-pagination button')[index].getAttribute('aria-current') === 'true'
    }, index)
    assert.equal(await slides.nth(index).evaluate(el => el.inert), false)
    for (let i = 0; i < await slides.count(); i++) {
      assert.equal(await slides.nth(i).evaluate(el => el.inert), i !== index, 'only the selected slide is focusable')
    }
  }
  assert.equal(await page.locator('.hero-project-snap-point').count(), 1, 'one vertical stop for the whole carousel')
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await settle()
  await swipe(190, 700, 0, -180)
  near((await carousel.boundingBox()).y, 0, 'vertical swipe enters carousel')
  const heroY = await page.evaluate(() => scrollY)
  await checkSelected(0)
  await swipe(340, 350, -290, 0)
  await checkSelected(1)
  near(await page.evaluate(() => scrollY), heroY, 'left swipe preserves page position')
  await swipe(45, 350, 290, 0)
  await checkSelected(0)
  near(await page.evaluate(() => scrollY), heroY, 'right swipe preserves page position')
  await buttons.nth(2).click()
  await checkSelected(2)
  near(await page.evaluate(() => scrollY), heroY, 'pagination button preserves page position')
  await page.screenshot({ path: '/tmp/hero-horizontal-mobile.png' })
  await swipe(190, 700, 0, -540)
  const approach = await page.locator('.hero-approach-snap-point').evaluate(el => ({ top: el.getBoundingClientRect().top, margin: parseFloat(getComputedStyle(el).scrollMarginTop) }))
  near(approach.top, approach.margin, 'vertical swipe exits from a middle slide')
  assert.equal(await pagination.getAttribute('aria-hidden'), 'true')
  await swipe(190, 250, 0, 500)
  near((await carousel.boundingBox()).y, 0, 'vertical swipe re-enters carousel')
  await checkSelected(2)
  await swipe(190, 250, 0, 500)
  assert.ok((await carousel.boundingBox()).y > 100, 'downward swipe returns to intro from a middle slide')
  await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await settle()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await buttons.last().click()
  await checkSelected(await slides.count() - 1)
  near(await page.evaluate(() => scrollY), heroY, 'reduced-motion pagination preserves page position')
  await swipe(340, 350, -290, 0)
  await checkSelected(0)
  near(await page.evaluate(() => scrollY), heroY, 'forward loop preserves page position')
  await swipe(45, 350, 290, 0)
  await checkSelected(await slides.count() - 1)
  near(await page.evaluate(() => scrollY), heroY, 'reverse loop preserves page position')
  await swipe(340, 350, -290, 0)
  await checkSelected(0)
  await swipe(340, 350, -290, 0)
  await checkSelected(1)
  await touch.detach()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS: real mobile swipes left/right, vertical entry/exit both directions, retained selection, buttons, focus, reduced motion, repeated forward and reverse loops')
} finally {
  await browser.close()
}
