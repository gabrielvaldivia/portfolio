// Run on /admin/login with the real Payload/admin CSS. No CMS content is changed.
// Checks the fixed-position invariant behind the native overscroll fix; headless
// Chromium does not reproduce macOS's rubber-band gesture itself.
(async () => {
  if (location.pathname !== '/admin/login') throw new Error('Use the admin login page for this fixture')
  const scroll = { x: scrollX, y: scrollY }
  const fixture = document.createElement('div')
  fixture.style.cssText = 'position:absolute;inset:0 0 auto;min-height:2400px'
  fixture.innerHTML = `
    <div class="template-default__nav-toggler-wrapper">
      <div class="template-default__nav-toggler-container"><button>Sidebar</button></div>
    </div>
    <div class="template-default template-default--nav-hydrated">
      <aside class="nav nav--nav-open"></aside>
      <div class="template-default__wrap">
        <header class="app-header">
          <div class="app-header__bg"></div>
          <div class="app-header__content"><div class="app-header__wrapper">Editor header</div></div>
        </header>
        <main class="collection-edit collection-edit--notes" style="min-height:2400px">
          <div class="doc-controls gutter"><div class="doc-controls__wrapper"><button>Publish</button></div></div>
          <div class="document-fields__edit">Note content</div>
        </main>
      </div>
    </div>`
  document.body.append(fixture)
  const shell = fixture.querySelector('.template-default')
  const header = fixture.querySelector('.app-header')
  const wrap = fixture.querySelector('.template-default__wrap')
  const main = fixture.querySelector('main')
  const controls = fixture.querySelector('.doc-controls')
  let passed = 0
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
    passed++
  }
  const near = (a, b) => Math.abs(a - b) < 1
  try {
    for (const [hydrated, open] of [[false, false], [false, true], [true, false], [true, true]]) {
      shell.classList.toggle('template-default--nav-hydrated', hydrated)
      shell.classList.toggle('template-default--nav-open', open)
      window.scrollTo({ top: 0, behavior: 'instant' })
      await new Promise(resolve => requestAnimationFrame(resolve))
      const height = parseFloat(getComputedStyle(header).height)
      const left = header.getBoundingClientRect().left
      check(getComputedStyle(header).position === (hydrated ? 'fixed' : 'relative'), 'Pin the initialized header while preserving the pre-hydration layout')
      check(getComputedStyle(controls).position === 'fixed', 'Publish controls must remain fixed')
      check(near(header.getBoundingClientRect().top, 0), 'Header must start at the viewport top')
      check(near(left, wrap.getBoundingClientRect().left), `Header left ${left} must match editor left ${wrap.getBoundingClientRect().left} (hydrated=${hydrated}, open=${open})`)
      check(near(header.getBoundingClientRect().width, wrap.getBoundingClientRect().width), 'Header must match the editor width')
      check(near(main.getBoundingClientRect().top - wrap.getBoundingClientRect().top, height), 'Reserve exactly one header height above the content')
      check(near(fixture.querySelector('.app-header__bg').getBoundingClientRect().top, 0), 'Header background must stay with the fixed header')
      if (hydrated) {
        window.scrollTo({ top: 500, behavior: 'instant' })
        await new Promise(resolve => requestAnimationFrame(resolve))
        check(near(header.getBoundingClientRect().top, 0), 'Header must remain pinned while scrolling')
        check(near(controls.getBoundingClientRect().top, 0), 'Publish controls must remain aligned while scrolling')
      }
    }
    return { passed, width: innerWidth }
  } finally {
    fixture.remove()
    window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' })
  }
})()
