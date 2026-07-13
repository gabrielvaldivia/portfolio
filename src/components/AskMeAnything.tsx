'use client'

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'

type FAQItem = {
  question: string
  answer: string
  showAsPill?: boolean
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

function cleanResponse(text: string) {
  return text.replace(/\{\{FOLLOWUPS:.*?\}\}/g, '').trim()
}

const RESTART_EVENT = 'ask-me-anything:restart'
const CONVERSATION_STATE_EVENT = 'ask-me-anything:conversation-state'

function SuggestionButton({ item, onSelect }: { item: FAQItem; onSelect: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const button = buttonRef.current
    const label = labelRef.current
    if (!button || !label) return

    const fitToRenderedLines = () => {
      button.style.width = 'fit-content'

      const range = document.createRange()
      range.selectNodeContents(label)
      const lines = Array.from(range.getClientRects())
      if (!lines.length) return

      const styles = window.getComputedStyle(button)
      const horizontalChrome =
        parseFloat(styles.paddingLeft) +
        parseFloat(styles.paddingRight) +
        parseFloat(styles.borderLeftWidth) +
        parseFloat(styles.borderRightWidth)
      const longestLine = Math.max(...lines.map((line) => line.width))
      button.style.width = `${Math.ceil(longestLine + horizontalChrome)}px`
    }

    fitToRenderedLines()
    const parent = button.parentElement
    const observer = new ResizeObserver(fitToRenderedLines)
    if (parent) observer.observe(parent)
    document.fonts?.ready.then(fitToRenderedLines)

    return () => observer.disconnect()
  }, [item.question])

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      className="max-w-[90%] cursor-pointer rounded-[24px] border border-dashed border-border-strong px-5 py-3 text-left text-body text-muted transition-colors duration-150 hover:border-content hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content tablet:max-w-[80%]"
    >
      <span ref={labelRef} className="text-pretty">{item.question}</span>
    </button>
  )
}

export function AskMeAnything({ items, suggestedQuestions }: { items: FAQItem[]; suggestedQuestions?: FAQItem[] }) {
  const questions = (suggestedQuestions?.length ? suggestedQuestions : items.filter((item) => item.showAsPill !== false)).slice(0, 5)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [followUpFocused, setFollowUpFocused] = useState(false)
  const [initialInputFocused, setInitialInputFocused] = useState(false)
  const conversationIdRef = useRef<number | string | null>(null)
  const reduceMotion = useReducedMotion()
  const hasConversation = messages.length > 0

  async function persistConversation(nextMessages: Message[]) {
    try {
      if (conversationIdRef.current) {
        await fetch(`/api/chat/conversations/${conversationIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextMessages }),
        })
        return
      }

      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Homepage · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          messages: nextMessages,
        }),
      })
      if (!response.ok) return
      const conversation = await response.json()
      conversationIdRef.current = conversation.id || null
    } catch {
      // Question ranking is non-critical and should never interrupt the chat.
    }
  }

  async function askAI(question: string, history = messages) {
    const text = question.trim()
    if (!text || isLoading) return

    const nextMessages: Message[] = [...history, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!response.ok || !response.body) throw new Error('Unable to get a response')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let answer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            answer += JSON.parse(line.slice(6)).text || ''
          } catch {
            // Ignore incomplete server-sent event data.
          }
        }
      }

      if (!answer.trim()) throw new Error('Empty response')
      const completedMessages: Message[] = [...nextMessages, { role: 'assistant', content: cleanResponse(answer) }]
      setMessages(completedMessages)
      void persistConversation(completedMessages)
      setFollowUpFocused(false)
    } catch {
      setError('Something went wrong. Please try asking again.')
    } finally {
      setIsLoading(false)
    }
  }

  function selectQuestion(item: FAQItem) {
    if (isLoading) return
    if (!item.answer.trim()) {
      askAI(item.question, [])
      return
    }
    setError('')
    const nextMessages: Message[] = [
      { role: 'user', content: item.question },
      { role: 'assistant', content: item.answer },
    ]
    setMessages(nextMessages)
    void persistConversation(nextMessages)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    askAI(input)
  }

  function clearConversation() {
    setMessages([])
    setInput('')
    setError('')
    setIsLoading(false)
    setFollowUpFocused(false)
    setInitialInputFocused(false)
    conversationIdRef.current = null
  }

  useEffect(() => {
    window.addEventListener(RESTART_EVENT, clearConversation)
    return () => window.removeEventListener(RESTART_EVENT, clearConversation)
  })

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CONVERSATION_STATE_EVENT, { detail: hasConversation }))
  }, [hasConversation])

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' as const }

  return (
    <div className="relative min-h-[440px] tablet:min-h-[520px]">
      <AnimatePresence mode="wait" initial={false}>
        {!hasConversation ? (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transition}
            className="flex flex-col items-start gap-3"
          >
            {questions.map((item) => (
              <SuggestionButton
                key={item.question}
                item={item}
                onSelect={() => selectQuestion(item)}
              />
            ))}
            <form
              onSubmit={handleSubmit}
              className={cn(
                'flex items-center gap-2 rounded-full border border-border-strong bg-background',
                initialInputFocused
                  ? 'w-full max-w-full border-solid py-0 pl-5 pr-2'
                  : 'w-fit max-w-[90%] border-dashed px-5 tablet:max-w-[80%]',
              )}
            >
              <label htmlFor="ask-anything-initial" className="sr-only">Ask your own question</label>
              <input
                id="ask-anything-initial"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onFocus={() => setInitialInputFocused(true)}
                onBlur={() => {
                  if (!input.trim()) setInitialInputFocused(false)
                }}
                placeholder="Ask your own question…"
                className={cn(
                  'min-w-0 bg-transparent py-3 text-body text-content outline-none placeholder:text-muted',
                  initialInputFocused ? 'flex-1' : 'w-auto [field-sizing:content]',
                )}
              />
              <AnimatePresence initial={false}>
                {initialInputFocused && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={transition}
                    type="submit"
                    aria-label="Send question"
                    disabled={!input.trim() || isLoading}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white disabled:cursor-default disabled:opacity-30"
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </form>
            {error && <p className="text-caption text-red-600 dark:text-red-400">{error}</p>}
          </motion.div>
        ) : (
          <motion.div
            key="conversation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={transition}
            className="flex min-h-[440px] flex-col tablet:min-h-[520px]"
          >
            <div className="flex flex-1 flex-col gap-3" aria-live="polite">
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.role}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transition}
                  className={cn('flex items-center gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'relative max-w-[90%] whitespace-pre-wrap px-5 py-3 text-pretty text-body tablet:max-w-[80%]',
                      message.role === 'user'
                        ? 'rounded-[24px] bg-accent text-white'
                        : 'rounded-[24px] bg-background-alt text-content',
                    )}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition} className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-[24px] bg-background-alt px-5 py-4" aria-label="Gabriel is responding">
                    {[0, 1, 2].map((dot) => <span key={dot} className="size-1.5 rounded-full bg-muted" />)}
                  </div>
                </motion.div>
              )}
              {!isLoading && (
                <div className="flex min-h-12 justify-end">
                  <form
                    onSubmit={handleSubmit}
                    className={cn('flex flex-col items-end', followUpFocused ? 'w-full' : 'w-fit')}
                  >
                    <label htmlFor="ask-anything-follow-up" className="sr-only">Ask a follow-up question</label>
                    <div className={cn(
                      'flex items-center gap-2 rounded-full border border-border-strong bg-background px-2 pl-5',
                      followUpFocused ? 'w-full' : 'w-fit',
                    )}>
                      <input
                        id="ask-anything-follow-up"
                        size={15}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onFocus={() => setFollowUpFocused(true)}
                        onBlur={() => {
                          if (!input.trim()) setFollowUpFocused(false)
                        }}
                        placeholder="Ask a follow-up…"
                        className="min-w-0 flex-1 bg-transparent py-3 text-body text-content outline-none placeholder:text-muted"
                      />
                      <AnimatePresence initial={false}>
                        {followUpFocused && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={transition}
                            type="submit"
                            aria-label="Send follow-up question"
                            disabled={!input.trim()}
                            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white disabled:cursor-default disabled:opacity-30"
                          >
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                    {error && <p className="mt-2 px-2 text-caption text-red-600 dark:text-red-400">{error}</p>}
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AskMeAnythingRestart() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleStateChange = (event: Event) => setVisible((event as CustomEvent<boolean>).detail)
    window.addEventListener(CONVERSATION_STATE_EVENT, handleStateChange)
    return () => window.removeEventListener(CONVERSATION_STATE_EVENT, handleStateChange)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(RESTART_EVENT))}
      aria-label="Start over"
      title="Start over"
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-background-alt hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content desktop:-mt-1 desktop:size-11"
    >
      <RotateCcw aria-hidden="true" className="size-[18px] desktop:size-5" strokeWidth={1.8} />
    </button>
  )
}
