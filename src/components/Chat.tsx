'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SocialIcon } from './Icons'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type FAQItem = {
  question: string
  answer: string
}

type ProjectLink = {
  title: string
  slug: string
}

type SocialLink = {
  platform: string
  url: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
}

const linkStyle = { textDecoration: 'underline', textUnderlineOffset: '3px' }

function linkify(text: string, projects: ProjectLink[]): React.ReactNode[] {
  text = stripMarkdown(text)

  const sortedProjects = [...projects].sort((a, b) => b.title.length - a.title.length)
  const projectNames = sortedProjects.map((p) => p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  // Match: [text](url), emails, bare URLs, or project names
  const mdLink = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/
  const email = /[\w.-]+@[\w.-]+\.\w+/
  const url = /https?:\/\/[^\s),]+/
  const projectPat = projectNames.length ? new RegExp(`\\b(${projectNames.join('|')})\\b`, 'i') : null

  const patterns = [mdLink.source, email.source, url.source]
  if (projectPat) patterns.push(projectPat.source)
  const combined = new RegExp(`(${patterns.join('|')})`, 'gi')

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const matched = match[0]

    // Markdown link [text](url)
    const mdMatch = matched.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (mdMatch) {
      parts.push(
        <a key={key++} href={mdMatch[2]} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {mdMatch[1]}
        </a>,
      )
    } else if (/^https?:\/\//.test(matched)) {
      parts.push(
        <a key={key++} href={matched} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {matched}
        </a>,
      )
    } else if (/^[\w.-]+@[\w.-]+\.\w+$/.test(matched)) {
      parts.push(
        <a key={key++} href={`mailto:${matched}`} style={linkStyle}>
          {matched}
        </a>,
      )
    } else {
      const project = sortedProjects.find((p) => p.title.toLowerCase() === matched.toLowerCase())
      if (project) {
        parts.push(
          <a key={key++} href={`/work/${project.slug}`} style={linkStyle}>
            {matched}
          </a>,
        )
      } else {
        parts.push(matched)
      }
    }

    lastIndex = combined.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function AssistantMessage({
  paragraphs,
  avatarUrl,
  topMargin,
  projects,
}: {
  paragraphs: string[]
  avatarUrl?: string
  topMargin: string
  projects: ProjectLink[]
}) {
  const [visibleCount, setVisibleCount] = useState(1)

  useEffect(() => {
    if (visibleCount >= paragraphs.length) return
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [visibleCount, paragraphs.length])

  const visible = paragraphs.slice(0, visibleCount)

  return (
    <div className={`flex items-end gap-2 ${topMargin}`}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt=""
          className="w-[42px] tablet:w-[45px] desktop:w-[48px] h-[42px] tablet:h-[45px] desktop:h-[48px] rounded-full object-cover shrink-0"
        />
      )}
      <div className="flex flex-col gap-1 max-w-[85%]">
        {visible.map((text, pi) => (
          <div
            key={pi}
            className="w-fit px-4 py-2.5 text-body rounded-[23px] bg-background text-content"
            style={{
              textWrap: 'pretty',
              animation: 'bubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
            } as React.CSSProperties}
          >
            {text ? (
              linkify(text, projects)
            ) : (
              <span className="inline-flex gap-1 py-1">
                <span className="w-1.5 h-1.5 bg-current opacity-40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-current opacity-40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-current opacity-40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Chat({
  faqItems,
  avatarUrl,
  projects = [],
  socialLinks = [],
}: {
  faqItems: FAQItem[]
  avatarUrl?: string
  projects?: ProjectLink[]
  socialLinks?: SocialLink[]
}) {
  const greetings = [
    "Hey! What can I help you with?",
    "Hi there! Ask me anything.",
    "Hey! What would you like to know?",
    "Hi! What's on your mind?",
    "Hey there! How can I help?",
  ]
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: greetings[0] }])
  const [showLinks, setShowLinks] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)
  const linksRef = useRef<HTMLDivElement>(null)
  const hasRandomized = useRef(false)

  useEffect(() => {
    if (!hasRandomized.current) {
      hasRandomized.current = true
      const random = greetings[Math.floor(Math.random() * greetings.length)]
      setMessages([{ role: 'assistant', content: random }])
    }
  }, [])

  useEffect(() => {
    if (!showLinks) return
    function handleClickOutside(e: MouseEvent) {
      if (linksRef.current && !linksRef.current.contains(e.target as Node)) {
        setShowLinks(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLinks])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    userScrolledUp.current = !atBottom
  }, [])

  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    }
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return
    userScrolledUp.current = false

    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMessage])

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6))
              accumulated += data.text
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: accumulated }
                return updated
              })
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Sorry, something went wrong. Feel free to email me at gabe@valdivia.works instead.",
        }
        return updated
      })
    }

    setIsStreaming(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const showSuggestions = messages.length === 1 && messages[0].role === 'assistant'

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-1 py-4" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 16px, black)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 16px, black)' }}>
        <div className="flex flex-col">
          {messages.map((msg, i) => {
            const prevRole = i > 0 ? messages[i - 1].role : null
            const sameAsPrev = prevRole === msg.role
            const topMargin = sameAsPrev ? 'mt-1' : i === 0 ? '' : 'mt-4'

            if (msg.role === 'user') {
              return (
                <div
                  key={i}
                  className={`flex justify-end ${topMargin}`}
                  style={{ animation: 'bubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                >
                  <div
                    className="w-fit max-w-[85%] px-4 py-2.5 text-body rounded-[23px] bg-blue-500 text-white"
                    style={{ textWrap: 'pretty' } as React.CSSProperties}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            }

            // Assistant: split into paragraphs, reveal with delay
            const paragraphs = msg.content
              ? msg.content.split(/\n\n+/).filter(Boolean)
              : ['']

            return (
              <AssistantMessage
                key={i}
                paragraphs={paragraphs}
                avatarUrl={avatarUrl}
                topMargin={topMargin}
                projects={projects}
              />
            )
          })}
        </div>
      </div>

      {/* Suggested pills */}
      {showSuggestions && faqItems.length > 0 && (
        <div className="px-1 pb-3 overflow-x-auto scrollbar-hide" style={{ maskImage: 'linear-gradient(to right, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent)' }}>
          <div className="flex gap-2 w-max">
            {faqItems.map((faq, i) => (
              <button
                key={i}
                onClick={() => sendMessage(faq.question)}
                className="shrink-0 px-4 py-2.5 text-body text-muted rounded-[23px] hover:text-content transition-colors whitespace-nowrap cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='23' ry='23' stroke='%23ccc' stroke-width='1.5' stroke-dasharray='8%2c 6' stroke-dashoffset='0' stroke-linecap='round'/%3e%3c/svg%3e")` }}
              >
                {faq.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-2">
        {socialLinks.length > 0 && (
          <div ref={linksRef} className="relative shrink-0 flex items-end">
            {/* Container that collapses from N icons to 1 */}
            <div className={`flex gap-2 transition-all duration-300 ease-in-out ${inputFocused || input.trim() ? 'w-[42px] tablet:w-[45px] desktop:w-[48px] overflow-hidden' : ''}`}>
              {inputFocused || input.trim() ? (
                <button
                  type="button"
                  onClick={() => setShowLinks(!showLinks)}
                  className={`w-[42px] tablet:w-[45px] desktop:w-[48px] h-[42px] tablet:h-[45px] desktop:h-[48px] flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer shrink-0 ${showLinks ? 'bg-black/10 dark:bg-white/10 rotate-45' : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              ) : (
                socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-[42px] tablet:w-[45px] desktop:w-[48px] h-[42px] tablet:h-[45px] desktop:h-[48px] flex items-center justify-center rounded-full bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-content transition-colors cursor-pointer shrink-0"
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))
              )}
            </div>
            {showLinks && (inputFocused || input.trim()) && (
              <div className="absolute bottom-12 left-0 bg-background rounded-[16px] shadow-lg border border-border py-2 min-w-[160px] z-10">
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2 text-caption text-muted hover:text-content hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    onClick={() => setShowLinks(false)}
                  >
                    <span className="w-[16px] h-[16px] flex items-center justify-center shrink-0">
                      <SocialIcon platform={link.platform} />
                    </span>
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={inputRef as any}
            value={input}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            onChange={(e) => {
              setInput(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
              setIsMultiline(el.scrollHeight > 50)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
              }
            }}
            placeholder="Message..."
            disabled={isStreaming}
            rows={1}
            className="block w-full bg-black/[0.02] dark:bg-white/[0.02] rounded-[23px] px-4 py-2.5 pr-11 text-body text-content placeholder:text-muted outline-none disabled:opacity-50 resize-none overflow-hidden"
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={isStreaming}
              className={`absolute right-[6px] w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-30 transition-opacity shrink-0 cursor-pointer ${isMultiline ? 'bottom-[6px]' : 'top-1/2 -translate-y-1/2'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
