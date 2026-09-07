// Read-only checks on /activity. Run in light/dark and at desktop/mobile sizes.
(() => {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches
  const rgb = dark ? '255, 255, 255' : '0, 0, 0'
  const body = `rgba(${rgb}, ${dark ? 0.8 : 0.9})`
  const strong = `rgb(${rgb})`
  const muted = `rgba(${rgb}, 0.6)`
  const subtle = `rgba(${rgb}, 0.4)`
  const checks = []
  const check = (label, result) => { if (!result) throw new Error(label); checks.push(label) }
  const heading = [...document.querySelectorAll('h1')].find(h => h.textContent === 'Activity')
  check('Activity has a visible page heading', Boolean(heading) && heading.getBoundingClientRect().height > 20 && !heading.classList.contains('sr-only'))
  check('Activity/Feed switcher is gone', !document.querySelector('nav[aria-label="Activity views"]'))
  check('Feed links are gone', !document.querySelector('a[href*="view=feed"]'))
  const sentences = [...document.querySelectorAll('p.text-body')].filter(p => /Someone|readers/.test(p.textContent))
  check('activity sentences rendered', sentences.length > 0)
  for (const sentence of sentences) {
    check('activity sentence uses body color', getComputedStyle(sentence).color === body)
    check('activity sentence wraps naturally', getComputedStyle(sentence).textWrapStyle === 'auto')
    for (const detail of sentence.querySelectorAll('.font-medium')) {
      check('locations and source titles use strong color', getComputedStyle(detail).color === strong)
    }
    const timestamp = sentence.querySelector('time')
    check('activity timestamp is inline in the first sentence', Boolean(timestamp))
    check('activity timestamp uses subtle color', getComputedStyle(timestamp).color === subtle)
    check('activity timestamp inherits the sentence font size', getComputedStyle(timestamp).fontSize === getComputedStyle(sentence).fontSize)
    check('timestamp follows a middle dot', timestamp.previousElementSibling?.textContent === '· ')
    check('activity has only one timestamp', sentence.parentElement.querySelectorAll('time').length === 1)
    const row = sentence.parentElement.parentElement
    const icon = row.firstElementChild.querySelector('svg')
    check('activity has a leading decorative icon', Boolean(icon) && row.firstElementChild.getAttribute('aria-hidden') === 'true')
    const expectedColor = icon.classList.contains('text-text-like') ? 'rgb(239, 68, 68)'
      : icon.classList.contains('text-text-highlight') ? dark ? 'rgb(251, 191, 36)' : 'rgb(180, 83, 9)'
      : dark ? 'rgb(0, 157, 255)' : 'rgb(0, 31, 235)'
    check('activity icon uses its type color', getComputedStyle(icon).color === expectedColor)
    check('activity icon is filled', getComputedStyle(icon).fill === expectedColor)
    if (icon.classList.contains('text-text-highlight')) {
      check('highlighter has separate barrel, collar, and nib shapes', icon.querySelectorAll('path').length === 3)
      check('highlighter has no outline closing the gaps', getComputedStyle(icon).stroke === 'none')
      const title = sentence.querySelector('a[href^="/notes/"]')
      check('highlight note title is its own link', Boolean(title) && title.parentElement === sentence)
      check('highlight row is not one large link', row.tagName === 'DIV')
      if (sentence.textContent.includes('Newburgh, NY')) {
        check('known US highlight location has a flag', Boolean(sentence.querySelector('img[src="/flags/figma/us.svg"]')))
      }
    }
    check('timestamp uses compact relative units or an absolute date', /^(now|\d+[mhd]|[A-Z][a-z]{2} \d{1,2}, \d{4})$/.test(timestamp.textContent))
    check('activity row has no content dimming', getComputedStyle(row).opacity === '1')
    check('activity row remains full width', Math.abs(row.getBoundingClientRect().width - row.parentElement.getBoundingClientRect().width) < 1)
    check('activity row has no hover background', getComputedStyle(row).backgroundColor === 'rgba(0, 0, 0, 0)')
    const divider = getComputedStyle(row, '::before')
    if (divider.borderTopWidth === '1px') {
      check('row divider retains its original border color', divider.borderTopColor === `rgba(${rgb}, ${dark ? 0.2 : 0.05})`)
      check('only the row divider has half opacity', divider.opacity === '0.5')
      const textInset = sentence.getBoundingClientRect().left - row.getBoundingClientRect().left
      check('row divider starts at the text, not the icon', Math.abs(parseFloat(divider.left) - textInset) < 1)
      check('row divider reaches the right edge', divider.right === '0px')
    }
  }
  const quotes = document.querySelectorAll('blockquote')
  check('highlight quotes rendered', quotes.length > 0)
  for (const quote of quotes) {
    const style = getComputedStyle(quote)
    check('activity quote uses muted color', style.color === muted)
    check('quote rule is 2px thick', style.borderLeftWidth === '2px')
    check('activity quote indent is reduced to 16px', style.paddingLeft === '16px')
  }
  check('no horizontal page overflow', document.documentElement.scrollWidth <= innerWidth)
  return { theme: dark ? 'dark' : 'light', width: innerWidth, passed: checks.length }
})()
