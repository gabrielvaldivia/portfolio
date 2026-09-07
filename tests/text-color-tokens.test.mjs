import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const css = readFileSync('src/app/(frontend)/globals.css', 'utf8')

test('four text roles are defined without colliding with body font size', () => {
  for (const role of ['strong', 'body', 'muted', 'subtle']) {
    assert.match(css, new RegExp(`--color-text-${role}:`))
  }
  assert.match(css, /--text-body: 20px/)
  assert.match(css, /--text-body-alpha: 0\.9/)
  assert.match(css, /--text-body-alpha: 0\.8/)
  assert.doesNotMatch(css, /--color-muted[\s:-]/)
})

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'admin' || entry.name === 'AgentationToolbar.tsx') return []
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.(tsx|css)$/.test(path) ? [path] : []
  })
}

test('frontend text uses roles rather than legacy or literal color classes', () => {
  const files = ['src/app/(frontend)', 'src/app/(photo)', 'src/components', 'src/blocks'].flatMap(sourceFiles)
  for (const path of files) {
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /(?<![\w-])text-(content|muted|white|black|(?:gray|neutral|red)-\d+)(?![\w-])/, path)
    assert.doesNotMatch(source, /var\(--color-muted\)/, path)
    for (const [, role] of source.matchAll(/\btext-text-([a-z]+(?:-[a-z]+)*)\b/g)) {
      assert.ok(css.includes(`--color-text-${role}:`), `${path}: undefined text role ${role}`)
    }
  }
})

test('footer text, icons, and copyright share the muted role', () => {
  const footer = readFileSync('src/components/Footer.tsx', 'utf8')
  assert.equal(footer.match(/text-text-muted/g)?.length, 3)
  assert.doesNotMatch(footer, /opacity-50/)
  assert.match(footer, /pt-5 pb-5 tablet:pb-10/)
  assert.match(footer, /px-5 tablet:px-10/)
})

test('Playground descriptions are muted and year labels retain their body color', () => {
  const playground = readFileSync('src/app/(frontend)/playground/page.tsx', 'utf8')
  assert.match(playground, /<h4 className="text-text-body[^\"]*">\{year\}/)
  assert.equal(playground.match(/<p className="text-text-muted[^\"]*">\{project.description\}/g)?.length, 3)
})

test('About Playground descriptions use muted in linked and unlinked rows', () => {
  const about = readFileSync('src/app/(frontend)/about/page.tsx', 'utf8')
  assert.equal(about.match(/<p className="text-text-muted[^\"]*">\{project.description\}/g)?.length, 2)
})

test('activity uses title-link hover, not full-row hover', () => {
  const activity = readFileSync('src/components/ActivityLazyContent.tsx', 'utf8')
  const row = activity.slice(activity.indexOf('function ActivityRow('), activity.indexOf('function EmptyState('))
  assert.doesNotMatch(row, /hover:bg-|focus-visible:bg-/)
  assert.match(row, /before:border-border before:opacity-50/)
  assert.doesNotMatch(row, /hover:opacity-|\sopacity-/)
  assert.match(activity, /const activityLinkClassName = .*hover:underline focus-visible:underline/)
  assert.match(activity, /<Link href=\{item.target.href\} className=\{activityLinkClassName\}>\{source\}<\/Link>/)
})

test('activity no longer renders a Feed view or a view switcher', () => {
  const page = readFileSync('src/app/(frontend)/activity/page.tsx', 'utf8')
  const header = readFileSync('src/components/SiteHeader.tsx', 'utf8')
  const content = readFileSync('src/components/ActivityLazyContent.tsx', 'utf8')
  assert.match(page, /<h1[^>]*>Activity<\/h1>/)
  assert.doesNotMatch(page, /sr-only|Feed|ActivityViewSwitcher/)
  assert.doesNotMatch(header, /SegmentedControl|Activity views|view=feed/)
  assert.doesNotMatch(content, /FeedItems|FeedGrid|fetchFeedPage/)
})

test('activity timestamps are inline, body-sized, and subtle', () => {
  const activity = readFileSync('src/components/ActivityLazyContent.tsx', 'utf8')
  const sentence = activity.slice(activity.indexOf('function ActivitySentence('), activity.indexOf('function getThumbnailContainerStyle('))
  assert.match(sentence, /text-text-subtle tabular-nums/)
  assert.match(sentence, /· /)
  assert.match(sentence, /<time dateTime=/)
  assert.doesNotMatch(sentence, /text-caption|text-sm|text-xs|truncate/)
})

test('activity event types have distinct semantic icon colors', () => {
  const activity = readFileSync('src/components/ActivityLazyContent.tsx', 'utf8')
  const icon = activity.slice(activity.indexOf('function ActivityIcon('), activity.indexOf('function ActivityRow('))
  assert.match(icon, /aria-hidden="true"/)
  assert.match(icon, /eventType === 'like'.*<Heart.*text-text-like/)
  assert.match(icon, /eventType === 'highlight'.*<HighlighterFilledIcon.*text-text-highlight/)
  assert.match(icon, /eventType === 'chat'.*<MessageCircle.*text-text-chat/)
  assert.equal(icon.match(/fill="currentColor"/g)?.length, 2)
  const icons = readFileSync('src/components/Icons.tsx', 'utf8')
  const highlighter = icons.slice(icons.indexOf('export function HighlighterFilledIcon('), icons.indexOf('export function EmailIcon('))
  assert.match(highlighter, /fill="currentColor"/)
  assert.equal(highlighter.match(/<path /g)?.length, 3)
})
