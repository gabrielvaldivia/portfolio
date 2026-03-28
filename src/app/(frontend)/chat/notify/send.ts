import { Resend } from 'resend'

interface NotifyParams {
  conversationId: string | number
  title: string
  messages: { role: string; content: string }[]
}

export async function sendNotification({ conversationId, title, messages }: NotifyParams) {
  if (!messages?.length) return

  const resend = new Resend(process.env.RESEND_API_KEY)

  const userMessages = messages.filter((m) => m.role === 'user')
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''
  const preview = messages
    .slice(-6)
    .map(
      (m) =>
        `${m.role === 'user' ? '\u2192' : '\u2190'} ${m.content.replace(/\{\{FOLLOWUPS:.*?\}\}/g, '').trim()}`,
    )
    .join('\n\n')

  await resend.emails.send({
    from: 'Portfolio Chat <onboarding@resend.dev>',
    to: 'gabe@valdivia.works',
    subject: `New chat: "${lastUserMessage.slice(0, 60)}${lastUserMessage.length > 60 ? '...' : ''}"`,
    text: `New conversation on your portfolio${title ? ` (${title})` : ''}.\n\nRecent messages:\n\n${preview}\n\n\u2014\nView in admin: ${process.env.NEXT_PUBLIC_SERVER_URL || 'https://gabrielvaldivia.com'}/admin/collections/conversations/${conversationId}`,
  })
}
