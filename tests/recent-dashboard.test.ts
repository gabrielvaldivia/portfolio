import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('recent dashboard uses the compact Activity timestamp inline with the title', () => {
  const component = readFileSync('src/components/admin/RecentDashboard.tsx', 'utf8')
  const styles = readFileSync('src/app/(payload)/custom.scss', 'utf8')

  assert.match(component, /formatActivityTime\(item\.updatedAt, nowMs\)/)
  assert.match(component, /recent-dashboard__time/)
  assert.match(component, /<span aria-hidden="true"> · <\/span>/)
  assert.doesNotMatch(component, /Edited|formatEditedTime|recent-dashboard__details/)
  assert.match(styles, /\.recent-dashboard__time\s*{[\s\S]*?var\(--cms-text-tertiary\)[\s\S]*?tabular-nums/)
  assert.match(styles, /\.recent-dashboard__title\s*{[^}]*overflow-wrap: anywhere;[^}]*white-space: normal;/)
  assert.match(styles, /\.recent-dashboard__time\s*{[^}]*white-space: nowrap;/)
  assert.doesNotMatch(styles, /\.recent-dashboard__title-text/)
  assert.doesNotMatch(styles, /\.recent-dashboard__details|\.recent-dashboard__type/)
})
