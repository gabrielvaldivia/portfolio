// Run through agent-browser eval --stdin on the frontend and admin pages.
// Uses a temporary content fixture: it never edits or saves a CMS document.
(() => {
  const admin = location.pathname.startsWith('/admin');
  const dark = admin
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const desktop = innerWidth >= 1280;
  const tablet = innerWidth >= 810;
  const bodySize = tablet ? 20 : 18;
  const titleSize = desktop ? 64 : tablet ? 60 : 34;
  const headingSizes = [desktop ? 100 : tablet ? 60 : 34, desktop ? 48 : tablet ? 36 : 28, desktop ? 30 : tablet ? 26 : 22];
  const bodyColor = dark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.9)';
  const contentColor = dark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
  const fixture = document.createElement('div');
  fixture.className = admin ? 'collection-edit--notes' : 'note-page';
  fixture.innerHTML = `
    <div class="document-fields__edit" style="max-width:840px;margin:auto">
      ${admin
        ? '<div class="field-type textarea notes-editor-title"><textarea rows="1" placeholder="Untitled note">The new cost of creation</textarea></div>'
        : '<h1 class="note-page-title">The new cost of creation</h1>'}
      <div class="notes-editor-body longform-body">
        <div class="${admin ? 'ContentEditable__root' : 'rich-text'}" ${admin ? 'contenteditable="true"' : ''}>
          <p class="LexicalEditorTheme__paragraph">A paragraph with <strong class="LexicalEditorTheme__textBold">bold text</strong>, <em>italic text</em>, and <a class="LexicalEditorTheme__link" href="#typography-test">a link</a>.</p>
          <p class="LexicalEditorTheme__paragraph">Another paragraph keeps the same spacing.</p>
          <h1 class="LexicalEditorTheme__h1">Heading one</h1>
          <h2 class="LexicalEditorTheme__h2">Heading two</h2>
          <h3 class="LexicalEditorTheme__h3">Vision</h3>
          <p class="LexicalEditorTheme__paragraph">Body text after a heading.</p>
          <blockquote class="LexicalEditorTheme__quote">Sometimes magic is just someone spending more time on something.</blockquote>
          <ul class="LexicalEditorTheme__ul"><li class="LexicalEditorTheme__listItem">A list item</li></ul>
          <ol class="LexicalEditorTheme__ol1"><li class="LexicalEditorTheme__listItem">A numbered item</li></ol>
          <a class="notes-editor-linked-image" href="#image"><span>View image</span></a>
        </div>
        <div class="LexicalEditorTheme__placeholder">Start writing…</div>
      </div>
    </div>`;
  document.body.append(fixture);
  const root = fixture.querySelector(admin ? '.ContentEditable__root' : '.rich-text');
  const title = fixture.querySelector(admin ? 'textarea' : '.note-page-title');
  const checks = [];
  function check(element, property, expected, label) {
    const actual = getComputedStyle(element)[property];
    if (actual !== expected) throw new Error(`${admin ? 'editor' : 'frontend'} ${innerWidth}px ${label || property}: expected ${expected}, received ${actual}`);
    checks.push(label || property);
  }
  try {
    check(title, 'fontSize', `${titleSize}px`, 'title size');
    check(title, 'fontWeight', '400', 'title weight');
    check(title, 'textAlign', 'center', 'title centered');
    check(title, 'color', contentColor, 'title color');
    for (const selector of ['p', 'li', 'blockquote']) {
      const element = root.querySelector(selector);
      check(element, 'fontSize', `${bodySize}px`, `${selector} size`);
      check(element, 'fontFamily', 'Inter, system-ui, sans-serif', `${selector} family`);
      check(element, 'lineHeight', `${bodySize * 1.65}px`, `${selector} line height`);
      check(element, 'color', bodyColor, `${selector} color`);
    }
    check(root, 'textWrap', 'wrap', 'natural body wrapping');
    check(root.querySelector('p + p'), 'marginTop', `${bodySize}px`, 'paragraph gap');
    for (const [index, size] of headingSizes.entries()) {
      const heading = root.querySelector(`h${index + 1}`);
      check(heading, 'fontSize', `${size}px`, `h${index + 1} size`);
      check(heading, 'color', contentColor, `h${index + 1} color`);
      check(heading, 'marginBottom', '0px', `h${index + 1} margin`);
    }
    check(root.querySelector('h2'), 'paddingTop', '64px', 'h2 top spacing');
    check(root.querySelector('h3'), 'paddingTop', '48px', 'h3 top spacing');
    check(root.querySelector('h3'), 'paddingBottom', '16px', 'h3 bottom spacing');
    check(root.querySelector('strong'), 'fontWeight', '600', 'bold weight');
    check(root.querySelector('a'), 'color', contentColor, 'link color');
    check(root.querySelector('a'), 'textDecorationLine', 'none', 'link decoration');
    check(root.querySelector('a'), 'borderBottomWidth', '0px', 'no dotted link border');
    check(root.querySelector('blockquote'), 'borderLeftWidth', '2px', 'quote rule');
    check(root.querySelector('blockquote'), 'paddingLeft', '24px', 'quote indent');
    if (admin) {
      const placeholder = fixture.querySelector('.LexicalEditorTheme__placeholder');
      for (const property of ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing']) {
        check(placeholder, property, getComputedStyle(root)[property], `placeholder ${property}`);
      }
      check(root.querySelector('.notes-editor-linked-image'), 'color', 'rgba(0, 0, 0, 0)', 'linked image text stays hidden');
    }
    return { surface: admin ? 'editor fixture' : 'frontend fixture', width: innerWidth, theme: dark ? 'dark' : 'light', passed: checks.length };
  } finally {
    fixture.remove();
  }
})()
