const FOLLOWUPS_PATTERN = /\{\{FOLLOWUPS:[\s\S]*?\}\}/g
const REPEAT_THRESHOLD = 0.6

function sentences(text: string) {
  return text
    .replace(FOLLOWUPS_PATTERN, '')
    .toLowerCase()
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/[^a-z0-9@\s]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.split(' ').length >= 4)
}

function wordSet(text: string) {
  return new Set(text.split(' ').filter((word) => word.length > 2))
}

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const word of a) if (b.has(word)) shared += 1
  return shared / Math.min(a.size, b.size)
}

/**
 * Share of the reply's sentences that closely match a sentence the assistant
 * already said earlier in the conversation.
 */
export function repetitionScore(reply: string, earlierReplies: string[]) {
  const replySentences = sentences(reply).map(wordSet)
  if (!replySentences.length) return 0

  const earlierSentences = earlierReplies.flatMap(sentences).map(wordSet)
  if (!earlierSentences.length) return 0

  const repeated = replySentences.filter((sentence) =>
    earlierSentences.some((earlier) => overlap(sentence, earlier) >= 0.8),
  )
  return repeated.length / replySentences.length
}

export function repeatsEarlierReply(reply: string, earlierReplies: string[]) {
  return repetitionScore(reply, earlierReplies) >= REPEAT_THRESHOLD
}

export const CHAT_REPETITION_NUDGE = `Your draft repeated what you already told this visitor earlier in the conversation. Write a new reply instead:
- Do not restate earlier points, the email address, or the same pitch.
- Treat the visitor's message as a follow-up and respond to what they are pushing on now, in one or two short sentences.
- If they want a detail the context does not include, such as a specific number, say plainly that you don't share that here and that it depends on the engagement, without re-explaining your approach.
- Still end with the {{FOLLOWUPS: ...}} line, using different questions than before.`
