import { indexHighlightText, rangeFromAnchor } from '../src/lib/noteHighlightDOM'
import { makeHighlightAnchor } from '../src/lib/noteHighlightAnchors'

// Bundle for a real browser; no database writes or third-party DOM emulation.
export function runHighlightDOMTests() {
  const container = document.createElement('div')
  const root = document.createElement('article')
  container.append(root)
  document.body.append(container)
  root.innerHTML = '<p>Before <em>this</em> passage.</p><span aria-hidden="true"><span>Decorative text</span></span><script>ignored script</script><style>ignored style</style><p>After.</p>'
  const expected = 'Before this passage.After.'
  const anchor = makeHighlightAnchor(expected, 0, 'Before this passage.'.length)
  const checks: string[] = []
  function check(label: string) {
    const index = indexHighlightText(root)
    if (index.text !== expected) throw new Error(`${label}: unexpected indexed text: ${index.text}`)
    if (rangeFromAnchor(root, anchor, index)?.toString() !== anchor.exact) throw new Error(`${label}: lost saved range`)
    checks.push(label)
  }
  try {
    check('excludes only hidden descendants, scripts, and styles')
    container.setAttribute('aria-hidden', 'true')
    check('preserves text and ranges under a modal-hidden ancestor')
    root.setAttribute('aria-hidden', 'true')
    check('preserves text when the modal hides the article root itself')
    container.removeAttribute('aria-hidden')
    root.removeAttribute('aria-hidden')
    check('preserves text after the modal closes')
    return checks
  } finally {
    container.remove()
  }
}
