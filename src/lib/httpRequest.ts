export class HTTPRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'HTTPRequestError'
  }
}

export function assertSameOrigin(
  request: Request,
  {
    message = 'Invalid request origin.',
    requireOrigin = false,
  }: { message?: string; requireOrigin?: boolean } = {},
) {
  const origin = request.headers.get('origin')
  if (
    (requireOrigin && !origin)
    || (origin && origin !== new URL(request.url).origin)
    || request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new HTTPRequestError(message, 403)
  }
}

export async function readJSONBody(
  request: Request,
  { maxBytes }: { maxBytes: number },
): Promise<Record<string, unknown>> {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json' && !mediaType?.endsWith('+json')) {
    throw new HTTPRequestError('JSON is required.', 415)
  }

  const contentLengthHeader = request.headers.get('content-length')
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null
  if (contentLength !== null && Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HTTPRequestError('The request is too large.', 413)
  }

  const reader = request.body?.getReader()
  if (!reader) throw new HTTPRequestError('A request body is required.', 400)

  const chunks: Uint8Array[] = []
  let size = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw new HTTPRequestError('The request is too large.', 413)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  let body: unknown
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new HTTPRequestError('Invalid request.', 400)
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HTTPRequestError('Invalid request.', 400)
  }

  return body as Record<string, unknown>
}

export function requestErrorResponse(error: unknown) {
  if (!(error instanceof HTTPRequestError)) return null
  return Response.json({ error: error.message }, { status: error.status })
}
