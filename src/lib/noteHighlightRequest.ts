import { HighlightError } from './noteHighlightStore'

export function checkHighlightOrigin(req: Request, requireOrigin = false) {
  const origin = req.headers.get('origin')
  if ((requireOrigin && !origin) || (origin && origin !== new URL(req.url).origin) || req.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HighlightError('Please use this feature directly on this website.', 403)
  }
}

export async function readHighlightJSON(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HighlightError('JSON is required.', 415)
  const reader = req.body?.getReader()
  if (!reader) throw new HighlightError('A request body is required.', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 8_192) { await reader.cancel(); throw new HighlightError('The request is too large.', 413) }
    chunks.push(value)
  }
  let body: unknown
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HighlightError('Invalid request.', 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HighlightError('Invalid request.', 400)
  return body as Record<string, unknown>
}
