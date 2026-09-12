// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_ENGINE, BROWSER_EXECUTABLE.
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
  await page.goto(process.env.HERO_TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await page.evaluate(() => document.fonts.ready)
  const pagination = page.locator('.hero-mobile-pagination')
  const slides = page.locator('.hero-mobile-slide')
  const check = async (visible, label) => {
    await page.waitForFunction(visible => {
      const el = document.querySelector('.hero-mobile-pagination')
      return (getComputedStyle(el).visibility === 'visible') === visible
    }, visible)
    assert.equal(await pagination.getAttribute('aria-hidden'), String(!visible), label)
    assert.equal(await pagination.evaluate(el => el.inert), !visible, `${label}: keyboard/click access`)
  }
  await check(true, 'visible at homepage intro')

  // Pause just before the first full-screen snap point. Disabling snap only
  // for this boundary probe lets us inspect a position normally passed mid-swipe.
  await page.evaluate(() => {
    document.documentElement.style.scrollSnapType = 'none'
    const top = document.querySelector('.hero-mobile-slide').getBoundingClientRect().top + scrollY
    scrollTo({ top: top - 40, behavior: 'instant' })
  })
  await page.waitForTimeout(100)
  await check(true, 'visible while slideshow is still entering')
  await page.evaluate(() => document.documentElement.style.removeProperty('scroll-snap-type'))
  await slides.first().evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' }))
  await check(true, 'visible on first full-screen slide')

  // It stays visible as we paginate, including on the final slide.
  for (let i = 1; i < await slides.count(); i++) {
    await pagination.locator('button').nth(i).click()
    await page.waitForFunction(i => Math.abs(document.querySelectorAll('.hero-mobile-slide')[i].getBoundingClientRect().left) < 1, i)
    await check(true, `visible on slide ${i + 1}`)
  }
  // Native scrolling across either duplicate wraps to the matching real slide.
  await page.locator('.hero-mobile-carousel').evaluate(el => el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'smooth' }))
  await page.waitForFunction(() => Math.abs(document.querySelector('.hero-mobile-carousel').scrollLeft - document.querySelector('.hero-mobile-carousel').clientWidth) < 1)
  await check(true, 'pagination visible after forward loop')
  await page.locator('.hero-mobile-carousel').evaluate(el => el.scrollTo({ left: 0, behavior: 'smooth' }))
  await page.waitForFunction(() => {
    const track = document.querySelector('.hero-mobile-carousel')
    const count = document.querySelectorAll('.hero-mobile-slide').length
    return Math.abs(track.scrollLeft - count * track.clientWidth) < 1
  })
  await check(true, 'pagination visible after reverse loop')
  await page.locator('.hero-approach-snap-point').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' }))
  await check(false, 'hidden after leaving slideshow')
  await slides.last().evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' }))
  await check(true, 'visible on re-entry from Approach')
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await check(true, 'visible when returning to intro')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForFunction(() => !document.querySelector('.hero-project-scroll-region').style.getPropertyValue('--hero-mobile-height'))
  assert.equal(await page.locator('.hero-project-slideshow button[aria-label^="Show Twinsi"]').isVisible(), true, 'desktop pagination is unchanged')
  assert.deepEqual(errors, [], 'no browser errors')
  console.log(JSON.stringify({ engine, result: 'PASS', checks: ['visible intro/entry', 'visible all slides', 'both loop boundaries', 'hidden exit', 're-entry', 'inert while hidden', 'desktop unchanged'] }))
} finally {
  await browser.close()
}
