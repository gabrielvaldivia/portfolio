// Run on /admin/login with real admin CSS. The fixture verifies responsive
// header behavior without opening or changing a CMS document.
(() => {
  const fixture = document.createElement('div')
  fixture.className = 'template-default template-default--nav-hydrated'
  fixture.innerHTML = `
    <div class="template-default__nav-toggler-container">
      <button class="template-default__nav-toggler" aria-label="Open navigation">Sidebar</button>
    </div>
    <div class="template-default__wrap">
      <header class="app-header">
        <div class="app-header__content">
          <div class="app-header__wrapper">
            <button class="app-header__mobile-nav-toggler nav-toggler" aria-label="Open navigation">Sidebar</button>
            <div class="app-header__controls-wrapper">
              <div class="app-header__step-nav-wrapper">
                <nav class="app-header__step-nav step-nav">
                  <a class="step-nav__home" href="/admin">Home</a>
                  <a href="/admin/collections/notes"><span>Notes</span></a>
                  <span class="step-nav__last">Current note</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main class="collection-edit collection-edit--notes collection-edit--is-editing">
        <div class="doc-controls gutter">
          <div class="doc-controls__wrapper">
            <div class="doc-controls__controls-wrapper">
              <div class="doc-controls__controls">
                <div class="notes-preview-controls">
                  <div class="form-submit">
                    <button id="action-preview" class="btn btn--style-secondary btn--size-medium" type="button"><span class="btn__content">Preview</span></button>
                  </div>
                </div>
                <div class="form-submit">
                  <button id="action-save" class="btn btn--style-primary btn--size-medium" type="button" aria-label="Publish changes">
                    <span class="btn__content"><span class="notes-publish-label-full">Publish changes</span><span class="notes-publish-label-compact" aria-hidden="true">Publish</span></span>
                  </button>
                </div>
              </div>
              <div class="doc-controls__popup popup">
                <div class="popup__trigger-wrap"><button class="popup-button" type="button" aria-label="More options"><div class="doc-controls__dots"><div></div><div></div><div></div></div></button></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>`
  document.body.append(fixture)
  const toggle = fixture.querySelector('.template-default__nav-toggler-container')
  const back = fixture.querySelector('.step-nav a[href="/admin/collections/notes"]')
  try {
    const toggleStyle = getComputedStyle(toggle)
    const backStyle = getComputedStyle(back)
    const backIconStyle = getComputedStyle(back, '::before')
    if (backStyle.display === 'none') throw new Error('The Notes back button should be visible at every screen size')
    if (backIconStyle.content !== '""') throw new Error('The back button should render the existing arrow icon')
    if (back.getAttribute('href') !== '/admin/collections/notes') throw new Error('The back button should target the Notes list')
    if (back.textContent.trim() !== 'Notes') throw new Error('The icon-only link must retain the accessible Notes label')
    if (innerWidth <= 768) {
      if (toggleStyle.display !== 'none') throw new Error('The sidebar toggle should be hidden in the mobile notes editor')
      if (getComputedStyle(fixture.querySelector('.app-header__mobile-nav-toggler')).display !== 'none') {
        throw new Error('The header must also hide Payload’s separate mobile sidebar toggle')
      }
    }
    if (innerWidth > 768 && toggleStyle.display === 'none') throw new Error('The desktop sidebar toggle should remain available')
    const controls = [back, fixture.querySelector('#action-preview'), fixture.querySelector('#action-save'), fixture.querySelector('.popup-button')]
    const bounds = controls.map(control => control.getBoundingClientRect())
    for (const [index, rect] of bounds.entries()) {
      if (rect.left < 0 || rect.right > innerWidth) throw new Error('Every header action must fit inside the viewport')
      if (index && rect.left - bounds[index - 1].right < 7.5) throw new Error('Header action hit areas must have at least 8px of separation')
      if (Math.abs(rect.top + rect.height / 2 - bounds[0].top - bounds[0].height / 2) > 1) throw new Error('Header controls must share a vertical center')
    }
    return { mode: innerWidth <= 768 ? 'mobile' : 'desktop', passed: innerWidth <= 768 ? 17 : 16, href: back.href, width: innerWidth, gaps: bounds.slice(1).map((rect, index) => rect.left - bounds[index].right) }
  } finally {
    fixture.remove()
  }
})()
