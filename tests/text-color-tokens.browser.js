// Evaluate on a note with agent-browser in both themes and at mobile/desktop widths.
// Reads the rendered page and adds a temporary token sample; never saves CMS data.
(() => {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const rgb = dark ? '255, 255, 255' : '0, 0, 0';
  const expected = {
    strong: `rgb(${rgb})`,
    body: `rgba(${rgb}, ${dark ? 0.8 : 0.9})`,
    muted: `rgba(${rgb}, 0.6)`,
    subtle: `rgba(${rgb}, 0.4)`,
  };
  const checks = [];
  const assert = (value, wanted, label) => {
    if (value !== wanted) throw new Error(`${label}: expected ${wanted}, received ${value}`);
    checks.push(label);
  };
  const fixture = document.createElement('div');
  fixture.innerHTML = Object.keys(expected).map(role => `<span class="text-body text-text-${role}">${role}</span>`).join('');
  document.body.append(fixture);
  try {
    for (const element of fixture.children) {
      const style = getComputedStyle(element);
      assert(style.color, expected[element.textContent], `${element.textContent} role`);
      assert(style.fontSize, innerWidth >= 1280 ? '20px' : innerWidth >= 810 ? '18px' : '16px', 'body size utility remains independent');
    }
    const footer = document.querySelector('footer');
    if (!footer) throw new Error('Footer not rendered');
    const footerStyle = getComputedStyle(footer);
    const gutterStyle = getComputedStyle(footer.firstElementChild);
    assert(footerStyle.paddingBottom, gutterStyle.paddingLeft, 'footer bottom equals left gutter');
    assert(footerStyle.paddingBottom, gutterStyle.paddingRight, 'footer bottom equals right gutter');
    for (const item of footer.querySelectorAll('button, a')) {
      assert(getComputedStyle(item).color, expected.muted, `footer ${item.getAttribute('aria-label') || item.textContent.trim().slice(0, 20)}`);
      assert(getComputedStyle(item).opacity, '1', 'footer has no compounded opacity');
    }
    const body = document.querySelector('.note-page .rich-text');
    if (!body) throw new Error('Note body not rendered');
    assert(getComputedStyle(body).color, expected.body, 'note body uses body token');
    const title = document.querySelector('.note-page-title');
    assert(getComputedStyle(title).color, expected.strong, 'note title uses strong token');
    const navigation = document.querySelector('nav[aria-label="Note navigation"]');
    if (!navigation) throw new Error('Note navigation not rendered');
    const navigationBox = navigation.getBoundingClientRect();
    const back = navigation.querySelector('a[href="/notes"]');
    assert(back.getBoundingClientRect().left, navigationBox.left, 'back link sits on the left');
    const next = navigation.querySelector('a[rel="next"]');
    if (next) assert(next.getBoundingClientRect().right, navigationBox.right, 'next note sits on the right');
    for (const link of navigation.querySelectorAll('a')) {
      assert(getComputedStyle(link).color, expected.muted, 'note navigation uses muted token');
      const box = link.getBoundingClientRect();
      const arrow = link.querySelector('svg').getBoundingClientRect();
      assert(Math.abs(arrow.top + arrow.height / 2 - box.top - box.height / 2) < 1, true, 'navigation arrow is vertically centered');
      assert(arrow.width > 0, true, 'navigation arrow is visible on every screen size');
    }
    const counts = document.querySelectorAll('[data-note-actions] button .font-mono');
    assert(counts.length, 3, 'all three pill counts rendered');
    for (const count of counts) {
      assert(getComputedStyle(count).color, expected.muted, 'pill count uses muted token');
    }
    for (const element of body.querySelectorAll('h1, h2, h3, h4, h5, h6, a')) {
      assert(getComputedStyle(element).color, expected.strong, 'note headings and links stay strong');
    }
    for (const divider of body.querySelectorAll('hr')) {
      const rect = divider.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      assert(rect.width, Math.min(250, bodyRect.width), 'note divider is 250px wide');
      assert(Math.abs(rect.left + rect.width / 2 - bodyRect.left - bodyRect.width / 2) < 1, true, 'note divider is centered');
      assert(getComputedStyle(divider).borderTopColor, expected.subtle, 'note divider uses subtle token');
    }
    return { width: innerWidth, theme: dark ? 'dark' : 'light', passed: checks.length };
  } finally {
    fixture.remove();
  }
})()
