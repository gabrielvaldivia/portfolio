export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const MAX_STORED_MESSAGES = 60
const MAX_MESSAGE_CHARS = 4_000
const MAX_STORED_CHARS = 60_000
const MAX_MODEL_MESSAGES = 14
const MAX_MODEL_HISTORY_CHARS = 12_000

export function normalizeConversationMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_STORED_MESSAGES) {
    return null
  }

  const messages: ChatMessage[] = []
  let totalChars = 0

  for (const item of value) {
    if (!item || typeof item !== 'object') return null

    const role = 'role' in item ? item.role : null
    const rawContent = 'content' in item ? item.content : null
    if ((role !== 'user' && role !== 'assistant') || typeof rawContent !== 'string') return null

    const content = rawContent.trim()
    if (!content || content.length > MAX_MESSAGE_CHARS) return null

    totalChars += content.length
    if (totalChars > MAX_STORED_CHARS) return null
    messages.push({ role, content })
  }

  return messages
}

export function normalizeAIChatMessages(value: unknown): ChatMessage[] | null {
  const normalized = normalizeConversationMessages(value)
  if (!normalized || normalized.at(-1)?.role !== 'user') return null

  const selected: ChatMessage[] = []
  let totalChars = 0

  for (let index = normalized.length - 1; index >= 0 && selected.length < MAX_MODEL_MESSAGES; index--) {
    const message = normalized[index]
    if (totalChars + message.content.length > MAX_MODEL_HISTORY_CHARS && selected.length > 0) break
    selected.unshift(message)
    totalChars += message.content.length
  }

  return selected
}
