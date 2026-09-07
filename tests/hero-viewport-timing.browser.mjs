// Browser-only regression for viewport timing; no Next server or CMS required.
// Optional: PLAYWRIGHT_MODULE, BROWSER_ENGINE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.BROWSER_ENGINE || 'webkit'
const source = ts.transpileModule(
  await readFile(new URL('../src/lib/observeMobileHeroViewport.ts', import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } },
).outputText
const browser = await engines[engine].launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
const near = (value, expected, label) => assert.ok(Math.abs(value - expected) < 1, `${label}: ${value} != ${expected}`)

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 744 }, hasTouch: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html { scroll-snap-type: y mandatory; }
      body { margin: 0; }
      #intro { height: 320px; scroll-snap-align: start; }
      #probe { position: fixed; top: 0; width: 0; height: 100dvh; visibility: hidden; }
      .hero-mobile-slide { position: relative; height: var(--hero-mobile-height, 100dvh); background: #59402e; }
      .snap { position: absolute; top: 0; height: 1px; scroll-snap-align: start; scroll-snap-stop: always; }
      .caption { position: absolute; bottom: calc(20px + max(0px, var(--hero-mobile-height, 100dvh) - var(--hero-mobile-viewport-height, 100dvh))); }
      #approach { height: 1400px; scroll-snap-align: start; }
      #work { height: 1400px; }
    </style>
    <div id="intro">Intro</div><div id="region"><div id="probe"></div>
      ${Array.from({ length: 4 }, (_, i) => `<div class="hero-mobile-slide"><div class="snap"></div><p class="caption">Project ${i + 1}</p></div>`).join('')}
    </div><div id="approach">Approach</div><div id="work">Work</div>`)
  await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
    const { observeMobileHeroViewport } = await import(url)
    URL.revokeObjectURL(url)
    window.startViewportObserver = () => observeMobileHeroViewport(document.querySelector('#region'), document.querySelector('#probe'))
    window.stopViewportObserver = window.startViewportObserver()
  }, source)

  const slides = page.locator('.hero-mobile-slide')
  const settle = () => page.waitForTimeout(650)
  const setVisualHeight = height => page.evaluate(async height => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: height })
    window.visualViewport.dispatchEvent(new Event('resize'))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, height)
  await slides.first().evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
  await settle()
  for (const height of [764, 794, 824, 844]) {
    await setVisualHeight(height)
    near((await slides.first().boundingBox()).height, height, 'live height without dvh/window resize')
    near(await slides.first().locator('.caption').evaluate(el => parseFloat(getComputedStyle(el).bottom)), 20, 'caption uses live height too')
    near((await slides.nth(1).boundingBox()).height, 744, 'offscreen slide stays frozen')
  }

  const recordIncoming = async (to, expected) => {
    const samples = await page.evaluate(async to => {
      const target = document.querySelectorAll('.hero-mobile-slide')[to]
      const samples = []
      target.scrollIntoView({ behavior: 'smooth' })
      const start = performance.now()
      while (performance.now() - start < 1000) {
        await new Promise(requestAnimationFrame)
        const { top, bottom, height } = target.getBoundingClientRect()
        const visible = Math.min(innerHeight, bottom) - Math.max(0, top)
        if (visible > 100 && visible < height * .45) samples.push({ height, visible })
      }
      return samples
    }, to)
    assert.ok(samples.length, 'recorded incoming slide before it reaches halfway')
    for (const sample of samples) near(sample.height, expected, `slide ${to + 1} resized before halfway`)
    near((await slides.nth(to).boundingBox()).y, 0, 'native pagination reaches slide start')
  }
  await recordIncoming(1, 844)
  await setVisualHeight(804)
  await recordIncoming(0, 804)

  // Changes below the slideshow must not move the document or scroll position.
  await page.evaluate(() => {
    document.documentElement.style.scrollSnapType = 'none'
    document.querySelector('#work').scrollIntoView({ behavior: 'instant' })
  })
  await settle()
  const geometry = () => page.evaluate(() => ({
    scrollY,
    work: document.querySelector('#work').getBoundingClientRect().top + scrollY,
    heights: [...document.querySelectorAll('.hero-mobile-slide')].map(el => el.getBoundingClientRect().height),
  }))
  const frozen = await geometry()
  for (const height of [744, 774, 814, 844]) {
    await setVisualHeight(height)
    assert.deepEqual(await geometry(), frozen, 'offscreen geometry and scroll position stay unchanged')
  }

  // Pinch zoom isn't browser chrome; don't shrink the slide to the zoomed view.
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('scroll-snap-type')
    document.querySelector('.hero-mobile-slide').scrollIntoView({ behavior: 'instant' })
  })
  await settle()
  await page.evaluate(() => Object.defineProperty(window.visualViewport, 'scale', { configurable: true, value: 2 }))
  await setVisualHeight(372)
  near((await slides.first().boundingBox()).height, 744, 'zoom uses layout viewport')

  // Clean up listeners and test the no-VisualViewport dvh fallback separately.
  await page.evaluate(() => {
    window.stopViewportObserver()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null })
    window.stopViewportObserver = window.startViewportObserver()
    document.querySelector('#probe').style.height = '704px'
  })
  await settle()
  near((await slides.first().boundingBox()).height, 704, 'dvh observer fallback')
  await page.evaluate(() => window.stopViewportObserver())
  assert.equal(await page.locator('#region').evaluate(el => el.style.getPropertyValue('--hero-mobile-height')), '')
  assert.equal(await page.locator('#region').evaluate(el => el.style.getPropertyValue('--hero-mobile-viewport-height')), '')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ engine, result: 'PASS', checks: ['live toolbar sizes before dvh', 'caption inset synchronization', 'early incoming resize both directions', 'native snap alignment', 'offscreen geometry', 'pinch zoom', 'dvh fallback', 'cleanup'] }))
} finally {
  await browser.close()
}
