import { escapeHTML } from './noteContent'

/**
 * Email links carry a token with the reader's address. Render the confirmation
 * step here, outside the site layout and its analytics, and act only on POST so
 * link scanners that open every URL cannot subscribe or unsubscribe anyone.
 */
export function subscriptionActionPage({ title, description, action, button }: {
  title: string
  description: string
  action: string
  button: string
}) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="color-scheme" content="light dark"><title>${escapeHTML(title)}</title><style>
:root{color-scheme:light dark;--bg:#fff;--fg:#111;--muted:#666;--border:#d0d0d0}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f2f2f2;--muted:#a0a0a0;--border:#3a3a3a}}
body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,-apple-system,BlinkMacSystemFont,Arial,Helvetica,sans-serif}
main{max-width:640px;margin:0 auto;padding:96px 20px;display:grid;gap:24px}
h1{margin:0;font-size:40px;line-height:1.1;font-weight:500;letter-spacing:-.03em}
p{margin:0;font-size:18px;line-height:1.6;color:var(--muted)}
button{min-height:44px;padding:10px 20px;border-radius:999px;border:1px solid var(--border);background:transparent;color:inherit;font:inherit;font-size:15px;cursor:pointer}
button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
a{color:inherit;font-size:15px}
</style></head><body><main><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p><form method="post" action="${escapeHTML(action)}"><input type="hidden" name="confirm" value="1"><button type="submit">${escapeHTML(button)}</button></form><a href="/notes">Read the notes</a></main></body></html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
