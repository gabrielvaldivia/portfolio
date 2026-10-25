import { NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'
import { escapeHTML } from '@/lib/noteContent'
import { assertSameOrigin, HTTPRequestError } from '@/lib/httpRequest'
import {
  type AuthorizationRequest,
  issueAuthorizationCode,
  OAuthError,
  parseAuthorizationRequest,
  redirectWith,
} from '@/lib/mcpOAuth'

export const dynamic = 'force-dynamic'

const AUTHORIZE_PARAMS = ['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'resource', 'scope']

const pageHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  // Not no-referrer: under that policy browsers send `Origin: null` with the
  // Allow form, which the same-site check below would reject.
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  // A consent screen must never be framed, or a page could trick a click onto Allow.
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
}

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHTML(title)}</title><style>
:root{color-scheme:light dark;--bg:#fff;--fg:#111;--muted:#666;--border:#d0d0d0;--alt:#f4f4f4}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f2f2f2;--muted:#a0a0a0;--border:#3a3a3a;--alt:#161616}}
body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,-apple-system,BlinkMacSystemFont,Arial,Helvetica,sans-serif}
main{max-width:560px;margin:0 auto;padding:96px 20px;display:grid;gap:24px}
h1{margin:0;font-size:36px;line-height:1.1;font-weight:500;letter-spacing:-.03em}
p{margin:0;font-size:17px;line-height:1.6;color:var(--muted)}
dl{margin:0;padding:16px 20px;border-radius:16px;background:var(--alt);display:grid;gap:10px;font-size:15px}
dt{color:var(--muted)}dd{margin:0;word-break:break-all}
.actions{display:flex;gap:12px;flex-wrap:wrap}
button{min-height:44px;padding:10px 22px;border-radius:999px;border:1px solid var(--border);background:transparent;color:inherit;font:inherit;font-size:15px;cursor:pointer}
button.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}
button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
</style></head><body><main>${body}</main></body></html>`
  return new Response(html, { status, headers: pageHeaders })
}

function errorPage(error: unknown) {
  const message = error instanceof OAuthError || error instanceof HTTPRequestError ? error.message : 'Something went wrong.'
  if (!(error instanceof OAuthError || error instanceof HTTPRequestError)) console.error('MCP authorization failed:', error)
  return page('Can’t connect', `<h1>Can’t connect</h1><p>${escapeHTML(message)}</p>`, 400)
}

async function currentEditor(request: Request) {
  const payload = await getPayload()
  const { user } = await payload.auth({ headers: request.headers })
  if (user?.collection !== 'users') return null
  // The password hash fingerprints issued tokens so a password change revokes them.
  return payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true, showHiddenFields: true }) as
    Promise<{ id: number | string; email?: string | null; hash?: unknown; salt?: unknown }>
}

function consentPage(authorization: AuthorizationRequest, email: string, params: URLSearchParams) {
  const hidden = AUTHORIZE_PARAMS
    .filter((name) => params.has(name))
    .map((name) => `<input type="hidden" name="${name}" value="${escapeHTML(params.get(name) || '')}">`)
    .join('')
  const destination = new URL(authorization.redirectUri)
  return page('Connect to your portfolio', `
<h1>Connect ${escapeHTML(authorization.client.name)}?</h1>
<p>It will be able to read and edit your portfolio content as ${escapeHTML(email)}, including drafting, scheduling, and publishing notes.</p>
<dl><dt>Signed-in account</dt><dd>${escapeHTML(email)}</dd><dt>Returns to</dt><dd>${escapeHTML(destination.origin + destination.pathname)}</dd></dl>
<form method="post" action="/oauth/authorize" class="actions">${hidden}
<button class="primary" type="submit" name="decision" value="allow">Allow</button>
<button type="submit" name="decision" value="deny">Deny</button>
</form>`)
}

/** The Allow form must be submitted from this site's own consent page. */
function assertApprovalFromThisSite(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  // Pages served before this fix, and some in-app browsers, send `Origin: null`;
  // the browser's Sec-Fetch-Site still says whether the form came from this site.
  if (origin === 'null' && fetchSite === 'same-origin') return
  assertSameOrigin(request, { requireOrigin: true, message: 'This approval did not come from this site. Start connecting again.' })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  let authorization: AuthorizationRequest
  try {
    authorization = parseAuthorizationRequest(params)
  } catch (error) {
    return errorPage(error)
  }

  const editor = await currentEditor(request)
  if (!editor) {
    const back = `/oauth/authorize?${params.toString()}`
    return NextResponse.redirect(new URL(`/admin/login?redirect=${encodeURIComponent(back)}`, request.url), 303)
  }
  return consentPage(authorization, editor.email || 'your account', params)
}

export async function POST(request: Request) {
  let params: URLSearchParams
  let authorization: AuthorizationRequest
  try {
    assertApprovalFromThisSite(request)
    const form = await request.formData()
    params = new URLSearchParams()
    for (const name of [...AUTHORIZE_PARAMS, 'decision']) {
      const value = form.get(name)
      if (typeof value === 'string') params.set(name, value)
    }
    authorization = parseAuthorizationRequest(params)
  } catch (error) {
    return errorPage(error)
  }

  if (params.get('decision') !== 'allow') {
    return NextResponse.redirect(redirectWith(authorization, { error: 'access_denied' }), 303)
  }
  const editor = await currentEditor(request)
  if (!editor) return errorPage(new OAuthError('access_denied', 'Your admin session ended. Start connecting again.'))

  const code = issueAuthorizationCode(authorization, editor)
  return NextResponse.redirect(redirectWith(authorization, { code }), 303)
}
