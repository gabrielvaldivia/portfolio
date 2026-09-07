// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its module path.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const url = process.env.HERO_TEST_URL || 'http://localhost:3000'
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.hero-mobile-slide')
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })

  // Only the explicit per-slide selection appears, never the full project taxonomy.
  const homeData = await page.request.get(new URL('/api/pages?where[slug][equals]=home&depth=2', url).href)
  const { docs } = await homeData.json()
  const hero = docs[0].sections.find(section => section.blockType === 'hero')
  const expected = Object.fromEntries(hero.slides.map(slide => [
    slide.project.slug,
    [...new Map((slide.pills || []).filter(label => typeof label === 'string' && label.trim())
      .map(label => [label.trim().toLowerCase(), label.trim()])).values()],
  ]))

  const inspect = selector => page.locator(selector).evaluateAll(elements => elements.map(el => {
    const list = el.querySelector('.hero-project-pills')
    const title = el.querySelector('h2')
    const description = title.parentElement.querySelector('p')
    const box = list?.getBoundingClientRect()
    const slug = title.closest('a').getAttribute('href').split('/').at(-1)
    return {
      slug,
      labels: [...(list?.querySelectorAll('li span') || [])].map(pill => pill.textContent.trim()),
      colors: [...(list?.querySelectorAll('li span') || [])].map(pill => getComputedStyle(pill).color),
      belowDescription: !list || !description || box.top >= description.getBoundingClientRect().bottom,
      withinSlide: title.getBoundingClientRect().top >= el.getBoundingClientRect().top,
      fits: !list || list.scrollWidth <= list.clientWidth + 1 && [...list.children].every(pill => {
        const rect = pill.getBoundingClientRect()
        return rect.left >= box.left - 1 && rect.right <= box.right + 1
      }),
    }
  }))

  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme })
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 })
      const slides = await inspect('.hero-mobile-slide')
      assert.equal(slides.length, hero.slides.length)
      for (const slide of slides) {
        assert.deepEqual(slide.labels, expected[slide.slug], `${slide.slug} labels`)
        assert.ok(slide.colors.every(color => color === 'rgb(255, 255, 255)'), `${theme} white pills`)
        assert.ok(slide.belowDescription && slide.fits && slide.withinSlide, `${width}px ${slide.slug} layout`)
      }
    }
    for (const width of [810, 1280, 1760]) {
      await page.setViewportSize({ width, height: 1015 })
      await page.locator('.hero-project-slideshow').evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
      // Keyboard focus pauses autoplay while each selected slide is inspected.
      const buttons = page.locator('.hero-project-slideshow button[aria-label^="Show "][aria-label*="slide"]')
      for (let i = 0; i < await buttons.count(); i++) {
        await buttons.nth(i).focus()
        await buttons.nth(i).click()
        await page.waitForTimeout(700)
        const [slide] = await inspect('.hero-project-slideshow')
        assert.deepEqual(slide.labels, expected[slide.slug])
        assert.ok(slide.colors.every(color => color === 'rgb(255, 255, 255)'))
        assert.ok(slide.belowDescription && slide.fits && slide.withinSlide, `${width}px ${slide.slug} desktop layout`)
      }
    }
  }
  if (process.env.HERO_SCREENSHOT_DIR) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.hero-mobile-slide').nth(1).evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${process.env.HERO_SCREENSHOT_DIR}/hero-pills-mobile.png` })
    await page.setViewportSize({ width: 1760, height: 1015 })
    await page.locator('.hero-project-slideshow').evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${process.env.HERO_SCREENSHOT_DIR}/hero-pills-desktop.png` })
  }
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS: CMS labels, all slides, 6 widths, both themes, wrapping, placement, runtime errors')
} finally {
  await browser.close()
}
