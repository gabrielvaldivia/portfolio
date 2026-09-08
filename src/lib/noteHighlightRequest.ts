import { HighlightError } from './noteHighlightStore'
import { assertSameOrigin, HTTPRequestError, readJSONBody } from './httpRequest'

export function checkHighlightOrigin(req: Request, requireOrigin = false) {
  try {
    assertSameOrigin(req, {
      message: 'Please use this feature directly on this website.',
      requireOrigin,
    })
  } catch (error) {
    if (error instanceof HTTPRequestError) throw new HighlightError(error.message, error.status)
    throw error
  }
}

export async function readHighlightJSON(req: Request): Promise<Record<string, unknown>> {
  try {
    return await readJSONBody(req, { maxBytes: 8_192 })
  } catch (error) {
    if (error instanceof HTTPRequestError) throw new HighlightError(error.message, error.status)
    throw error
  }
}
