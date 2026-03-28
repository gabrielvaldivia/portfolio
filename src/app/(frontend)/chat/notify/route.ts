import { sendNotification } from './send'

export async function POST(req: Request) {
  const { conversationId, title, messages } = await req.json()

  if (!messages?.length) {
    return Response.json({ error: 'No messages' }, { status: 400 })
  }

  try {
    await sendNotification({ conversationId, title, messages })
    return Response.json({ ok: true })
  } catch (e: any) {
    console.error('Email notification failed:', e.message)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}
