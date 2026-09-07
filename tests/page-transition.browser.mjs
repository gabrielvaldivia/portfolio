// Verify first paint, refresh and client navigation without replaying a loader.
// PLAYWRIGHT_MODULE, BROWSER_ENGINE, BROWSER_EXECUTABLE and HERO_TEST_URL override defaults.
import assert from 'node:assert/strict'

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.BROWSER_ENGINE || 'webkit'
const browser = await engines[engine].launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
const url = process.env.HERO_TEST_URL || 'http://localhost:3000'

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack || error) })
  await page.addInitScript(() => {
    window.entranceFrames = []
    const deadline = performance.now() + 30000
    const record = () => {
      const main = document.querySelector('main.page-transition')
      if (main) {
        const style = getComputedStyle(main)
        window.entranceFrames.push({ opacity: style.opacity, animation: style.animationName })
      }
      if (window.entranceFrames.length < 45 && performance.now() < deadline) requestAnimationFrame(record)
    }
    requestAnimationFrame(record)
  })

  for (const refresh of [false, true]) {
    if (refresh) await page.reload({ waitUntil: 'domcontentloaded' })
    else await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.entranceFrames.length >= 45)
    const frames = await page.evaluate(() => window.entranceFrames)
    assert.ok(frames.every(frame => frame.opacity === '1' && frame.animation === 'none'), `${refresh ? 'refresh' : 'first load'} stays visible from first paint`)
  }

  await page.locator('nav:visible a[href="/about"]:visible').first().click()
  await page.waitForURL('**/about')
  await page.waitForSelector('main.page-transition-enter')
  assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).animationName), 'fadeInUp', 'client navigation still animates')
  await page.waitForTimeout(600)
  await page.locator('header a[href="/"]').click()
  await page.waitForURL(url + '/')
  await page.waitForSelector('main.page-transition-enter')
  assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).animationName), 'fadeInUp', 'return navigation still animates')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.entranceFrames.length >= 45)
  assert.ok((await page.evaluate(() => window.entranceFrames)).every(frame => frame.opacity === '1' && frame.animation === 'none'), 'refresh after navigation does not animate')

  const noJS = await browser.newPage({ javaScriptEnabled: false })
  await noJS.goto(url, { waitUntil: 'domcontentloaded' })
  await noJS.waitForSelector('main.page-transition')
  assert.equal(await noJS.locator('main').evaluate(el => getComputedStyle(el).opacity), '1', 'server-rendered content never depends on JavaScript to become visible')
  assert.deepEqual(errors, [], 'no runtime errors')
  console.log(JSON.stringify({ engine, result: 'PASS', checks: ['first paint', 'refresh', 'client navigation', 'return navigation', 'server-rendered visibility'] }))
} finally {
  await browser.close()
}
