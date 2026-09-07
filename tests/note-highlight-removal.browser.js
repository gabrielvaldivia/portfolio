// Installs a browser-only fixture around an existing note. All highlight writes
// are intercepted, so exercising Remove cannot mutate the real database.
(async () => {
  window.restoreHighlightRemovalFixture?.()
  const originalFetch = window.fetch.bind(window)
  const original = await originalFetch('/api/notes/highlights?noteId=49').then(response => response.json())
  if (!original.highlights?.length) throw new Error('Open software-is-an-instrument with a saved highlight first.')
  const saved = original.highlights[0]
  const other = { location: 'London, United Kingdom', createdAt: '2026-09-06T10:00:00.000Z', mine: false }
  const owned = { ...saved, count: 2, mine: true, attributions: [
    { location: 'Brooklyn, NY', createdAt: '2026-09-06T12:00:00.000Z', mine: true }, other,
  ] }
  const state = { response: { ...original, highlights: [owned, ...original.highlights.slice(1)] }, deletes: [], failNext: false }
  window.highlightRemovalFixture = state
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    if (url.pathname !== '/api/notes/highlights') return originalFetch(input, init)
    const method = init?.method || (input instanceof Request ? input.method : 'GET')
    if (method === 'DELETE') {
      state.deletes.push(JSON.parse(init.body))
      if (state.failNext) {
        state.failNext = false
        return Response.json({ error: 'Please try again.' }, { status: 503 })
      }
      state.response = { ...original, highlights: [{ ...saved, count: 1, mine: false, attributions: [other] }, ...original.highlights.slice(1)] }
    } else if (method !== 'GET') throw new Error('Highlight writes are blocked by this test fixture.')
    return Response.json(state.response)
  }
  window.restoreHighlightRemovalFixture = () => { window.fetch = originalFetch }
  window.dispatchEvent(new Event('focus'))
  return 'Fixture ready: click the highlighted passage. Remove is available only for the Brooklyn reader.'
})()
