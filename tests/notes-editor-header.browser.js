// Run on /admin/login with the real admin CSS; no CMS document is changed.
(() => {
  const fixture = document.createElement('div')
  fixture.className = 'template-default'
  fixture.innerHTML = '<header class="app-header"></header><main class="collection-edit collection-edit--pages"></main>'
  document.body.append(fixture)
  const surface = fixture.querySelector('main')
  try {
    if (getComputedStyle(document.body, '::before').content !== '""') {
      throw new Error('Other admin pages should retain the header divider')
    }
    surface.classList.replace('collection-edit--pages', 'collection-edit--notes')
    if (getComputedStyle(document.body, '::before').content !== 'none') {
      throw new Error('The notes editor header should not have a divider')
    }
    if (getComputedStyle(fixture.querySelector('header')).borderBottomWidth !== '0px') {
      throw new Error('The header itself should not add a replacement border')
    }
    return { passed: 3, width: innerWidth }
  } finally {
    fixture.remove()
  }
})()
