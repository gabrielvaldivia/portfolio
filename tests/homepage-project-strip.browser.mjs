// Optional: HERO_TEST_URL, PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE.
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.HERO_TEST_URL || 'http://localhost:3000'
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
})
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 2, `${label}: ${actual} != ${expected}`)

try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1600, height: 1100 },
      isMobile: mobile,
      hasTouch: mobile,
    })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: '[data-agentation-root], nextjs-portal { display: none !important; }' })

    if (mobile) {
      const carousel = page.locator('.hero-mobile-carousel')
      await carousel.waitFor({ state: 'visible' })
      await page.waitForFunction(() => document.querySelector('.hero-project-scroll-region')?.style.getPropertyValue('--hero-mobile-height'))
      assert.equal(await page.locator('.hero-project-strip').count(), 0, 'mobile mounts the original slideshow instead of the strip')
      await carousel.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
      await page.waitForTimeout(300)
      const box = await carousel.boundingBox()
      assert.ok(box.height > box.width, 'mobile slideshow is portrait')
      const buttons = page.locator('.hero-mobile-pagination button')
      const count = await buttons.count()
      const currentIndex = () => buttons.evaluateAll(items => items.findIndex(el => el.getAttribute('aria-current') === 'true'))
      const firstIndex = await currentIndex()
      await page.waitForFunction(index => {
        const buttons = [...document.querySelectorAll('.hero-mobile-pagination button')]
        return buttons.findIndex(el => el.getAttribute('aria-current') === 'true') !== index
      }, firstIndex, { timeout: 8500 })
      const selected = await currentIndex()
      await page.waitForTimeout(700)
      const heroY = await page.evaluate(() => scrollY)
      const touch = await page.context().newCDPSession(page)
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: 350 }] })
      for (let step = 1; step <= 18; step++) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 340 - step * 16, y: 350 }] })
        await page.waitForTimeout(16)
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await touch.detach()
      await page.waitForTimeout(800)
      assert.equal(await currentIndex(), (selected + 1) % count, 'swipe advances the restored mobile slideshow')
      near(await page.evaluate(() => scrollY), heroY, 'swiping leaves the document in place')
      near(await page.evaluate(() => document.documentElement.scrollWidth), 390, 'mobile page does not overflow')
    } else {
      const strip = page.getByRole('region', { name: 'Scroll through featured projects' })
      await strip.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }))
      const geometry = await strip.evaluate(el => {
        const cards = [...el.querySelectorAll('[data-project-card]')]
        return {
          x: el.getBoundingClientRect().x,
          width: el.clientWidth,
          viewport: innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          step: cards[1].offsetLeft - cards[0].offsetLeft,
          first: cards[0].getBoundingClientRect().x,
          second: cards[1].getBoundingClientRect().x,
        }
      })
      near(geometry.x, 0, 'strip reaches the viewport edge')
      near(geometry.width, geometry.viewport, 'no clipping at the content gutter')
      near(geometry.pageWidth, geometry.viewport, 'no horizontal document overflow')
      near(geometry.first, mobile ? 20 : 40, 'first card aligns with viewport gutter')
      assert.ok(geometry.second < geometry.viewport, 'next card remains visible')
      assert.equal(await page.locator('.hero-project-strip button').count(), 0, 'no pagination buttons')
      assert.equal(await page.locator('#about .rich-text a').count(), 0, 'bio is plain text')
      const columns = await page.evaluate(() => {
        const about = document.querySelector('#about .home-grid-main').getBoundingClientRect()
        const approach = document.querySelector('.home-approach-copy').getBoundingClientRect()
        const card = document.querySelector('[data-project-card]').getBoundingClientRect()
        return { aboutX: about.x, approachX: approach.x, aboutWidth: about.width, cardWidth: card.width }
      })
      if (!mobile) {
        near(columns.approachX, columns.aboutX, 'Approach copy follows the About column')
        near(columns.cardWidth, (geometry.viewport - 80) * 0.9, 'project card spans 90% of available width')
      }


      const box = await strip.boundingBox()
      const firstCard = await page.locator('[data-project-card]').first().boundingBox()
      assert.ok(firstCard.height <= (mobile ? 844 : 1100) * 0.9 + 1, 'cards never exceed 90vh')
      assert.ok(Math.abs(firstCard.width / firstCard.height - (mobile ? 3 / 4 : 3 / 2)) < 0.005, 'portrait mobile and landscape desktop card aspect ratios')
      const x = mobile ? 290 : firstCard.x + firstCard.width * 0.75
      const y = Math.max(100, box.y + 150)
      if (mobile) {
        const touch = await page.context().newCDPSession(page)
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
        for (let step = 1; step <= 18; step++) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 14, y }] })
          await page.waitForTimeout(16)
        }
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await touch.detach()
      } else {
        const card = page.locator('[data-project-card]').first()
        await page.mouse.move(x, y)
        await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-project-card] span[aria-hidden]')).opacity === '1')
        await page.mouse.down()
        await page.mouse.move(x - 280, y, { steps: 20 })
        await page.mouse.up()
      }
      await page.waitForTimeout(800)
      const centeredCard = page.locator('[data-project-card]').nth(1)
      const centeredBox = await centeredCard.boundingBox()
      near(centeredBox.x + centeredBox.width / 2, geometry.viewport / 2, 'second card centers after dragging')
      for (let index = 2; index < await page.locator('[data-project-card]').count(); index++) {
        await page.mouse.move(1200, y)
        await page.mouse.down()
        await page.mouse.move(920, y, { steps: 20 })
        await page.mouse.up()
        await page.waitForTimeout(300)
        const cardBox = await page.locator('[data-project-card]').nth(index).boundingBox()
        if (index === await page.locator('[data-project-card]').count() - 1) {
          near(cardBox.x + cardBox.width, geometry.viewport - 40, 'last card aligns with the right gutter')
        } else {
          near(cardBox.x + cardBox.width / 2, geometry.viewport / 2, 'middle card centers after dragging')
        }
      }
      assert.equal(new URL(page.url()).pathname, '/', 'drag does not activate a project link')

    }

    const readMore = page.getByRole('link', { name: 'Read more', exact: true })
    await readMore.scrollIntoViewIfNeeded()
    const intro = page.locator('[data-about-intro="preview"]')
    const before = await intro.boundingBox()
    const beforeHeading = await intro.locator('h2').boundingBox()
    const beforeBio = await intro.locator('.rich-text').boundingBox()
    const bio = await intro.locator('.rich-text').innerText()
    await readMore.click()
    await page.waitForURL('**/about', { timeout: 60000 })
    await page.waitForTimeout(300)
    const fullIntro = page.locator('[data-about-intro="full"]')
    const after = await fullIntro.boundingBox()
    near(after.x, before.x, 'About keeps horizontal alignment')
    near(after.y, before.y, 'About keeps reading position')
    const afterHeading = await fullIntro.locator('h2').boundingBox()
    const afterBio = await fullIntro.locator('.rich-text').boundingBox()
    near(afterHeading.y, beforeHeading.y, 'the heading remains in place')
    near(afterBio.y, beforeBio.y, 'the shared bio remains in place')
    near(afterBio.height, beforeBio.height, 'the shared bio retains its geometry')
    assert.equal(await fullIntro.locator('.rich-text').innerText(), bio, 'copy is shared across pages')
    for (const name of ['Talks', 'Interviews', 'Patents', 'Playground']) {
      assert.equal(await page.getByRole('heading', { name, exact: true }).count(), 1)
    }
    assert.equal(await page.getByRole('link', { name: 'View timeline', exact: true }).getAttribute('href'), '/timeline')

    await page.goBack()
    await page.waitForURL(url => url.pathname === '/')
    await page.waitForTimeout(300)
    near((await intro.boundingBox()).y, before.y, 'Back restores the reading position without scrolling through the page')
    if (!mobile) {
      await page.setViewportSize({ width: mobile ? 390 : 1600, height: mobile ? 200 : 400 })
      const cappedCard = await page.locator('[data-project-card]').first().boundingBox()
      assert.ok(cappedCard.height <= (mobile ? 200 : 400) * 0.9 + 1, '90vh cap holds on short viewports')
      assert.ok(Math.abs(cappedCard.width / cappedCard.height - (mobile ? 3 / 4 : 3 / 2)) < 0.005, 'height cap preserves aspect ratio')
    }

    if (!mobile) {
      await page.setViewportSize({ width: 2200, height: 1000 })
      const wide = await page.evaluate(() => ({
        content: document.querySelector('#about .home-page-content').getBoundingClientRect().width,
        tagline: document.querySelector('.home-hero-tagline').getBoundingClientRect().width,
        strip: document.querySelector('.hero-project-strip-viewport').getBoundingClientRect(),
        cardX: document.querySelector('[data-project-card]').getBoundingClientRect().x,
        page: document.documentElement.scrollWidth,
      }))
      assert.equal(wide.content, 1400, 'content maximum matches production About')
      assert.equal(wide.tagline, 2200, 'hero tagline has no maximum width')
      assert.equal(wide.strip.width, 2200, 'overflow remains visible beyond the grid')
      assert.equal(wide.strip.x, 0, 'strip reaches both viewport edges')
      assert.equal(wide.page, 2200, 'wide layout does not overflow the document')
    }
    assert.deepEqual(errors, [], 'no browser runtime errors')
    console.log(`PASS: ${mobile ? 'mobile slideshow autoplay and swipe' : 'desktop drag and hover'}, full-width strip, shared About bio, expansion, and Back`)
    await page.close()
  }
} finally {
  await browser.close()
}
