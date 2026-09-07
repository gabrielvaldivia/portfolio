// Run with agent-browser eval --stdin on the target site's generated OG image.
// Read-only: fetch HTML and images without mounting a note or recording views.
(async () => {
  const checks = []
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
    checks.push(message)
  }
  for (const slug of ['a-quilt-for-generations', 'i-built-a-second-brain-out-of-markdown-files']) {
    const path = `/notes/${slug}`
    const response = await fetch(path)
    assert(response.ok, `${slug}: page loads`)
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
    const one = (selector) => {
      const elements = doc.querySelectorAll(selector)
      assert(elements.length === 1, `${slug}: one ${selector}`)
      return elements[0]
    }
    const canonical = one('link[rel="canonical"]').getAttribute('href')
    assert(new URL(canonical).pathname === path, `${slug}: canonical matches note`)
    assert(one('meta[property="og:url"]').content === canonical, `${slug}: OG URL matches canonical`)
    const imageURL = one('meta[property="og:image"]').content
    assert(new URL(imageURL).pathname === `${path}/og`, `${slug}: unique generated image`)
    assert(Boolean(new URL(imageURL).searchParams.get('v')), `${slug}: image updates with note version`)
    assert(new URL(imageURL).searchParams.get('design') === 'centered-name-v1', `${slug}: fresh image URL for centered-name design`)
    assert(one('meta[name="twitter:image"]').content === imageURL, `${slug}: Twitter uses generated image`)
    assert(one('meta[property="og:image:width"]').content === '1200', `${slug}: declared width`)
    assert(one('meta[property="og:image:height"]').content === '630', `${slug}: declared height`)
    assert(one('meta[property="og:type"]').content === 'article', `${slug}: article type`)
    assert(one('meta[name="twitter:card"]').content === 'summary_large_image', `${slug}: large Twitter card`)
    const alt = one('meta[property="og:image:alt"]').content
    assert(alt === one('meta[name="twitter:image:alt"]').content, `${slug}: image descriptions match`)
    const imageResponse = await fetch(imageURL)
    assert(imageResponse.ok && imageResponse.headers.get('content-type').includes('image/png'), `${slug}: PNG served`)
    const bitmap = await createImageBitmap(await imageResponse.blob())
    assert(bitmap.width === 1200 && bitmap.height === 630, `${slug}: actual image dimensions`)
    bitmap.close()
  }
  const missing = await fetch('/notes/this-note-does-not-exist-og-check/og')
  assert(missing.status === 404, 'Missing notes do not generate public cards')
  const home = await fetch('/')
  assert(home.ok, 'Homepage loads')
  const homeDoc = new DOMParser().parseFromString(await home.text(), 'text/html')
  const tagline = 'Your design partner for first-generation products.'
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    assert(homeDoc.querySelector(selector)?.content === tagline, `Homepage tagline: ${selector}`)
  }
  return { passed: checks.length, checks }
})()
