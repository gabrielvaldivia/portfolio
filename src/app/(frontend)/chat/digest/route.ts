import { Resend } from 'resend'
import { getPayload } from '@/lib/payload'

export const dynamic = 'force-dynamic'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(req: Request) {
  // Authorize: Vercel cron sends an Authorization header with CRON_SECRET,
  // or allow manual trigger with ?secret=...
  const authHeader = req.headers.get('authorization')
  const urlSecret = new URL(req.url).searchParams.get('secret')
  const expected = process.env.CRON_SECRET
  const authed =
    !expected ||
    authHeader === `Bearer ${expected}` ||
    urlSecret === expected
  if (!authed) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload()
  const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const result = await payload.find({
    collection: 'conversations',
    where: { createdAt: { greater_than: sinceDate.toISOString() } },
    sort: '-createdAt',
    limit: 500,
    depth: 0,
  })

  const conversations = result.docs as any[]

  if (conversations.length === 0) {
    return Response.json({ ok: true, sent: false, reason: 'No new chats this week' })
  }

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://gabrielvaldivia.com'

  // Build the list of chats with their first user question as a preview
  const items = conversations.map((c) => {
    const msgs = (c.messages || []) as { role: string; content: string }[]
    const firstUser = msgs.find((m) => m.role === 'user')?.content || '(no user message)'
    const userCount = msgs.filter((m) => m.role === 'user').length
    return {
      id: c.id,
      title: c.title || 'Untitled',
      location: c.location || '',
      firstUser: firstUser.trim(),
      userCount,
      url: `${serverUrl}/admin/collections/conversations/${c.id}`,
    }
  })

  const totalUserMsgs = items.reduce((sum, it) => sum + it.userCount, 0)

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; color: #111;">
      <h2 style="margin: 0 0 8px;">Weekly chat digest</h2>
      <p style="color: #666; margin: 0 0 24px;">
        ${conversations.length} conversation${conversations.length === 1 ? '' : 's'} ·
        ${totalUserMsgs} user message${totalUserMsgs === 1 ? '' : 's'} · past 7 days
      </p>
      ${items
        .map(
          (it) => `
        <div style="border-top: 1px solid #eee; padding: 16px 0;">
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
            ${escapeHtml(it.title)}${it.location ? ` · ${escapeHtml(it.location)}` : ''} · ${it.userCount} msg${it.userCount === 1 ? '' : 's'}
          </div>
          <div style="margin-bottom: 8px;">
            "${escapeHtml(it.firstUser.slice(0, 200))}${it.firstUser.length > 200 ? '…' : ''}"
          </div>
          <a href="${it.url}" style="color: #0070f3; text-decoration: none; font-size: 14px;">View chat →</a>
        </div>
      `,
        )
        .join('')}
    </div>
  `

  const text = [
    `Weekly chat digest`,
    `${conversations.length} conversations · ${totalUserMsgs} user messages · past 7 days`,
    '',
    ...items.map(
      (it) =>
        `${it.title}${it.location ? ` · ${it.location}` : ''} (${it.userCount} msg${it.userCount === 1 ? '' : 's'})\n"${it.firstUser.slice(0, 200)}${it.firstUser.length > 200 ? '…' : ''}"\n${it.url}`,
    ),
  ].join('\n\n')

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Portfolio Chat <onboarding@resend.dev>',
    to: 'gabe@valdivia.works',
    subject: `Weekly chat digest · ${conversations.length} chat${conversations.length === 1 ? '' : 's'}`,
    text,
    html,
  })

  return Response.json({ ok: true, sent: true, count: conversations.length })
}
