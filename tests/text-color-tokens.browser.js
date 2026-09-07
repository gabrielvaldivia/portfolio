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
    const recommendationsHeading = document.querySelector('#continue-reading-heading');
    assert(getComputedStyle(recommendationsHeading).color, expected.strong, 'continue reading uses strong token');
    assert(getComputedStyle(recommendationsHeading).textWrapStyle, 'auto', 'continue reading wraps naturally');
    const recommendations = recommendationsHeading.parentElement;
    const recommendationList = recommendations.querySelector('ul');
    if (innerWidth >= 1280) {
      assert(getComputedStyle(recommendations).display, 'grid', 'desktop recommendations use columns');
      assert(recommendationList.getBoundingClientRect().left > recommendationsHeading.getBoundingClientRect().left, true, 'desktop links in right column');
      assert(Math.abs(recommendationList.getBoundingClientRect().top - recommendationsHeading.getBoundingClientRect().top) < 1, true, 'desktop columns top-aligned');
    } else {
      assert(recommendationList.getBoundingClientRect().top >= recommendationsHeading.getBoundingClientRect().bottom, true, 'recommendations stack below title');
    }
    for (const link of document.querySelectorAll('.note-recommendation-title a')) {
      assert(getComputedStyle(link).color, expected.strong, 'recommended titles stay strong');
      assert(Boolean(link.querySelector('svg')), true, 'recommendation has a hover chevron');
      if (innerWidth >= 810) {
        const titleRange = document.createRange();
        titleRange.selectNodeContents(link.querySelector('span'));
        const lastLine = Array.from(titleRange.getClientRects()).at(-1);
        const chevron = link.querySelector('svg').getBoundingClientRect();
        assert(chevron.left >= lastLine.right && chevron.top < lastLine.bottom && chevron.bottom > lastLine.top, true, 'chevron follows the last title line');
      }
      for (const element of [link.parentElement, link, link.querySelector('span')]) {
        assert(getComputedStyle(element).textWrapStyle, 'auto', 'recommendation title has no balanced or pretty wrapping');
        assert(getComputedStyle(element).whiteSpace, 'normal', 'recommendation title uses normal whitespace');
      }
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
