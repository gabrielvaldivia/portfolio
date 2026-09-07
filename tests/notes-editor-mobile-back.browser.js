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
          <nav class="app-header__step-nav step-nav">
            <a class="step-nav__home" href="/admin">Home</a>
            <a href="/admin/collections/notes"><span>Notes</span></a>
            <span class="step-nav__last">Current note</span>
          </nav>
        </div>
      </header>
      <main class="collection-edit collection-edit--notes collection-edit--is-editing"></main>
    </div>`
  document.body.append(fixture)
  const toggle = fixture.querySelector('.template-default__nav-toggler-container')
  const back = fixture.querySelector('.step-nav a[href="/admin/collections/notes"]')
  try {
    const toggleStyle = getComputedStyle(toggle)
    const backStyle = getComputedStyle(back)
    const backIconStyle = getComputedStyle(back, '::before')
    if (innerWidth <= 768) {
      if (toggleStyle.display !== 'none') throw new Error('The sidebar toggle should be hidden in the mobile notes editor')
      if (backStyle.display === 'none') throw new Error('The Notes breadcrumb should become the mobile back button')
      if (backIconStyle.content !== '""') throw new Error('The back button should render the existing arrow icon')
      if (back.getAttribute('href') !== '/admin/collections/notes') throw new Error('The back button should target the Notes list')
      if (back.textContent.trim() !== 'Notes') throw new Error('The icon-only link must retain the accessible Notes label')
      return { mode: 'mobile', passed: 5, href: back.href, width: innerWidth }
    }
    if (toggleStyle.display === 'none') throw new Error('The desktop sidebar toggle should remain available')
    if (backStyle.display !== 'none') throw new Error('The mobile back button should not replace desktop navigation')
    return { mode: 'desktop', passed: 2, width: innerWidth }
  } finally {
    fixture.remove()
  }
})()
