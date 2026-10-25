import assert from 'node:assert/strict'
import test from 'node:test'
import { repeatsEarlierReply } from '../src/lib/chatRepetition'

const retainerAnswer =
  "I focus on bringing exceptional expertise and product intuition with urgency and high craft. That's why I prefer to work with a flat weekly retainer. We end when the work is done.\n\nIf you're interested in learning more about my availability, feel free to email me at gabe@valdivia.works. I'd be happy to discuss further.\n\n{{FOLLOWUPS: What's your availability? | How do you work?}}"

test('flags a reply that restates an earlier answer', () => {
  assert.equal(repeatsEarlierReply(retainerAnswer, [retainerAnswer]), true)
})

test('allows a reply that builds on an earlier answer', () => {
  const followUp =
    "I don't list a number here since it depends on the team and how long we'd work together. Send me a note about what you're building and I'll share a quote."
  assert.equal(repeatsEarlierReply(followUp, [retainerAnswer]), false)
})

test('ignores the first reply in a conversation', () => {
  assert.equal(repeatsEarlierReply(retainerAnswer, []), false)
})

test('conversation updates may only append to saved messages', async () => {
  const { extendsConversation } = await import('../src/lib/chatMessages')
  type Message = { role: 'user' | 'assistant'; content: string }
  const saved: Message[] = [{ role: 'assistant', content: 'Hi' }, { role: 'user', content: 'Q' }]
  const next: Message[] = [...saved, { role: 'assistant', content: 'A' }]
  assert.equal(extendsConversation(saved, next), true)
  assert.equal(extendsConversation(saved, [{ role: 'assistant', content: 'Rewritten' }, ...next.slice(1)]), false)
  assert.equal(extendsConversation(next, saved), false)
})
