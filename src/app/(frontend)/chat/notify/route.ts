import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { conversationId, title, messages } = await req.json()

  if (!messages?.length) {
    return Response.json({ error: 'No messages' }, { status: 400 })
  }

  const userMessages = messages.filter((m: any) => m.role === 'user')
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''
  const preview = messages
    .slice(-6)
    .map((m: any) => `${m.role === 'user' ? '→' : '←'} ${m.content}`)
    .join('\n\n')

  try {
    await resend.emails.send({
      from: 'Portfolio Chat <chat@valdivia.works>',
      to: 'gabe@valdivia.works',
      subject: `New chat: "${lastUserMessage.slice(0, 60)}${lastUserMessage.length > 60 ? '...' : ''}"`,
      text: `New conversation on your portfolio${title ? ` (${title})` : ''}.\n\nRecent messages:\n\n${preview}\n\n—\nView in admin: ${process.env.NEXT_PUBLIC_SERVER_URL || 'https://gabrielvaldivia.com'}/admin/collections/conversations/${conversationId}`,
    })
    return Response.json({ ok: true })
  } catch (e: any) {
    console.error('Email notification failed:', e.message)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}
