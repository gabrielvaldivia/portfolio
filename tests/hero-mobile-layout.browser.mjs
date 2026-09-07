// PLAYWRIGHT_MODULE, BROWSER_ENGINE, BROWSER_EXECUTABLE, HERO_TEST_URL and
// HERO_SCREENSHOT_DIR can override the local browser verification defaults.
import assert from 'node:assert/strict'

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.BROWSER_ENGINE || 'webkit'
const browser = await engines[engine].launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 2, `${label}: ${actual} != ${expected}`)

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.HERO_TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.hero-mobile-media')
  await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })
  const slides = page.locator('.hero-mobile-slide')
  const colors = new Map()

  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme })
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 })
      for (let index = 0; index < await slides.count(); index++) {
        await slides.nth(index).evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
        await page.waitForTimeout(700)
        await page.waitForFunction(index => {
          const media = document.querySelectorAll('.hero-mobile-slide')[index].querySelector('img, video')
          return media instanceof HTMLImageElement ? media.complete && media.naturalWidth > 0 : media.readyState >= 2
        }, index, { timeout: 20000 })
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const result = await slides.nth(index).evaluate(slide => {
          const media = slide.querySelector('.hero-mobile-media')
          const title = slide.querySelector('h2')
          const details = slide.querySelector('.hero-mobile-details')
          const pagination = document.querySelector('.hero-mobile-pagination')
          const image = media.querySelector('img')
          const video = media.querySelector('video')
          const box = media.getBoundingClientRect()
          const lines = pagination.getBoundingClientRect()
          return {
            id: slide.dataset.projectId,
            top: slide.getBoundingClientRect().top,
            height: slide.getBoundingClientRect().height,
            imageBottom: box.bottom,
            titleBottom: title.getBoundingClientRect().bottom,
            detailsTop: details.getBoundingClientRect().top,
            captionBottom: slide.querySelector('.hero-mobile-caption').getBoundingClientRect().bottom,
            imageCenter: box.top + box.height / 2,
            mediaHeight: getComputedStyle(media).height,
            surfaceTransform: getComputedStyle(slide.querySelector('.hero-mobile-surface')).transform,
            regionStyle: slide.closest('.hero-project-scroll-region').style.cssText,
            paginationCenter: lines.top + lines.height / 2,
            paginationCount: document.querySelectorAll('.hero-mobile-pagination').length,
            background: getComputedStyle(slide.querySelector('.hero-mobile-surface')).backgroundColor,
            titleColor: getComputedStyle(title).color,
            mask: getComputedStyle(media).maskImage,
            imageLoaded: !image || image.naturalWidth > 0,
            videoMuted: !video || video.muted && video.defaultMuted && video.volume === 0 && video.loop,
            arrowWidth: slide.querySelector('a[aria-label^="Open"]').getBoundingClientRect().width,
            menuWidth: document.querySelector('.mobile-site-nav button').getBoundingClientRect().width,
            pills: [...slide.querySelectorAll('.hero-project-pills li')].map(pill => ({
              top: pill.getBoundingClientRect().top,
              fontSize: getComputedStyle(pill.firstElementChild).fontSize,
            })),
          }
        })
        near(result.top, 0, 'slide remains snapped')
        near(result.height, 844, 'slide remains full height')
        near(result.imageBottom, result.titleBottom, 'image ends at the title bottom')
        assert.ok(result.detailsTop >= result.imageBottom - 1, 'description and pills are outside the image')
        assert.ok(result.captionBottom <= 845, `caption fits inside the viewport: ${JSON.stringify({theme, width, index, ...result})}`)
        near(result.paginationCenter, result.imageCenter, `pagination is centered on the image (${JSON.stringify({theme, width, index, ...result})})`)
        assert.equal(result.paginationCount, 1, 'pagination stays shared and sticky')
        near(result.arrowWidth, result.menuWidth, 'project arrow matches the menu button size')
        assert.match(result.mask, /linear-gradient/)
        assert.equal((result.mask.match(/%/g) || []).length, 11, 'mask uses the eased alpha stops')
        result.pills.forEach(pill => {
          near(pill.top, result.pills[0].top, 'pills stay on one row')
          assert.equal(pill.fontSize, '11px', 'mobile pills are compact')
        })
        assert.notEqual(result.background, 'rgba(0, 0, 0, 0)', 'solid color behind the text')
        assert.notEqual(result.background, 'rgb(24, 24, 24)', 'each current project has its own color')
        assert.equal(result.titleColor, 'rgb(255, 255, 255)')
        assert.ok(result.imageLoaded && result.videoMuted, 'media loads and video stays muted')
        if (colors.has(result.id)) assert.equal(result.background, colors.get(result.id), 'slide color stays independent of pagination and theme')
        else colors.set(result.id, result.background)
        if (process.env.HERO_SCREENSHOT_DIR && width === 390 && theme === 'dark') {
          await page.screenshot({ path: `${process.env.HERO_SCREENSHOT_DIR}/hero-mobile-layout-${index}.png` })
        }
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  const desktop = await page.locator('.hero-project-slideshow').boundingBox()
  near(desktop.width / desktop.height, 16 / 9, 'desktop aspect ratio unchanged')
  assert.deepEqual(errors, [], 'no runtime errors')
  console.log(JSON.stringify({ engine, result: 'PASS', checks: ['image/title boundary', 'solid text area', 'eased mask', 'image-centered pagination', 'per-slide colors', 'both themes', 'responsive wrapping', 'muted video', 'desktop unchanged'] }))
} finally {
  await browser.close()
}
