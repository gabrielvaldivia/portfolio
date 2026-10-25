type ChatStreamMessage = { role: 'user' | 'assistant'; content: string }

export class ChatStreamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

/**
 * Stream an answer from /api/chat. The idle timeout restarts with every chunk,
 * so long answers finish while a stalled connection still fails.
 */
export async function streamChat(
  messages: ChatStreamMessage[],
  { signal, onText, idleTimeoutMs = 30_000 }: {
    signal: AbortSignal
    onText?: (answer: string) => void
    idleTimeoutMs?: number
  },
) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  let idleTimer = setTimeout(abort, idleTimeoutMs)
  const resetIdleTimer = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(abort, idleTimeoutMs)
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) {
      throw new ChatStreamError(`Chat request failed with ${response.status}`, response.status)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let answer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      resetIdleTimer()
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
        try {
          answer += JSON.parse(line.slice(6)).text || ''
        } catch {
          // Ignore incomplete server-sent event data.
          continue
        }
        onText?.(answer)
      }
    }

    if (!answer.trim()) throw new ChatStreamError('Chat response was empty')
    return answer
  } finally {
    clearTimeout(idleTimer)
    signal.removeEventListener('abort', abort)
  }
}
