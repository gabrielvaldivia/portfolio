import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('mobile admin content occupies the grid column after the fixed sidebar', () => {
  const styles = readFileSync('src/app/(payload)/custom.scss', 'utf8')
  const mobileSidebarStyles = styles.slice(
    styles.indexOf('body:has(.template-default--nav-hydrated.template-default--nav-open .app-header)::before'),
    styles.indexOf('@media (max-width: 768px) and (hover: none)'),
  )
  const browserFixture = readFileSync('tests/admin-header-position.browser.js', 'utf8')

  assert.match(mobileSidebarStyles, /\.template-default__wrap\s*{[^}]*grid-column: 2;/)
  assert.match(browserFixture, /<aside class="nav nav--nav-open"><\/aside>/)
})
