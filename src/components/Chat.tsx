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
  animate = true,
}: {
  paragraphs: string[]
  avatarUrl?: string
  topMargin: string
  projects: ProjectLink[]
  animate?: boolean
}) {
  const [visibleCount, setVisibleCount] = useState(animate ? 1 : paragraphs.length)

  useEffect(() => {
    if (!animate || visibleCount >= paragraphs.length) return
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [visibleCount, paragraphs.length, animate])

  useEffect(() => {
    if (!animate) setVisibleCount(paragraphs.length)
  }, [animate, paragraphs.length])

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
            className="w-fit px-4 py-2.5 text-body rounded-[23px] bg-background dark:bg-white/10 text-content"
            style={{
              textWrap: 'pretty',
              ...(animate ? { animation: 'bubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' } : {}),
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

type Conversation = {
  id: number
  title: string
  location?: string
  messages: Message[]
  updatedAt: string
}

const GREETINGS = [
  "Hey! What can I help you with?",
  "Hi there! Ask me anything.",
  "Hey! What would you like to know?",
  "Hi! What's on your mind?",
  "Hey there! How can I help?",
]

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function HamburgerIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 2h18M1 10h12" />
    </svg>
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
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('conversationId')) return []
    return [{ role: 'assistant', content: GREETINGS[0] }]
  })
  const [showLinks, setShowLinks] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [iconsCollapsed, setIconsCollapsed] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [animateBubbles, setAnimateBubbles] = useState(true)
  const linksRef = useRef<HTMLDivElement>(null)
  const hasRandomized = useRef(false)
  const locationRef = useRef('')

  useEffect(() => {
    if (!hasRandomized.current && !sessionStorage.getItem('conversationId')) {
      hasRandomized.current = true
      const random = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
      setMessages([{ role: 'assistant', content: random }])
    }
    // Fetch location
    fetch('/chat')
      .then((r) => r.json())
      .then((data) => {
        if (data.location) locationRef.current = data.location
      })
      .catch(() => {})
    // Restore conversation from session
    const savedId = sessionStorage.getItem('conversationId')
    if (savedId) {
      setAnimateBubbles(false)
      fetch(`/chat/conversations/${savedId}`)
        .then((r) => r.json())
        .then((doc) => {
          if (doc.messages?.length) {
            setMessages(doc.messages)
            setConversationId(doc.id)
          }
          setTimeout(() => setAnimateBubbles(true), 100)
        })
        .catch(() => setAnimateBubbles(true))
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

  const shouldCollapse = inputFocused || !!input.trim() || showLinks
  useEffect(() => {
    if (shouldCollapse) {
      setIconsCollapsed(true)
    } else {
      const timer = setTimeout(() => setIconsCollapsed(false), 300)
      return () => clearTimeout(timer)
    }
  }, [shouldCollapse])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    userScrolledUp.current = !atBottom
    setHasScrolled(el.scrollTop > 10)
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

  // Save conversation after streaming completes
  useEffect(() => {
    if (isStreaming) return
    if (messages.length < 2 || !messages.some((m) => m.role === 'user')) return

    if (conversationId) {
      fetch(`/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }).catch(() => {})
    } else {
      const loc = locationRef.current
      const title = formatDate(new Date()) + (loc ? ` · ${loc}` : '')
      fetch('/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, location: loc, messages }),
      })
        .then((r) => r.json())
        .then((doc) => {
          if (doc.id) {
            setConversationId(doc.id)
            sessionStorage.setItem('conversationId', String(doc.id))
          }
        })
        .catch(() => {})
    }
  }, [isStreaming])

  function loadConversations() {
    fetch('/chat/conversations')
      .then((r) => r.json())
      .then((docs) => setConversations(docs))
      .catch(() => {})
  }

  function loadConversation(conv: Conversation) {
    setAnimateBubbles(false)
    setSidebarOpen(false)
    // Delay setting messages until after animation flag is committed
    requestAnimationFrame(() => {
      setMessages(conv.messages)
      setConversationId(conv.id)
      sessionStorage.setItem('conversationId', String(conv.id))
      requestAnimationFrame(() => setAnimateBubbles(true))
    })
  }

  function startNewConversation() {
    const random = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
    setMessages([{ role: 'assistant', content: random }])
    setConversationId(null)
    sessionStorage.removeItem('conversationId')
    setSidebarOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const showSuggestions = messages.length === 1 && messages[0].role === 'assistant'

  return (
    <div className="flex flex-col h-full relative">
      {/* Hamburger */}
      <button
        onClick={() => { setSidebarOpen(true); loadConversations() }}
        className={`absolute top-1 left-0 z-20 w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-content transition-all duration-200 cursor-pointer ${hasScrolled ? 'bg-background/60 dark:bg-white/10 backdrop-blur-xl' : ''}`}
      >
        <HamburgerIcon />
      </button>

      {/* Sidebar */}
      <div
        className={`absolute inset-0 z-30 flex transition-opacity duration-200 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className={`w-[280px] bg-background rounded-[20px] border border-border p-4 flex flex-col h-full transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between pb-4">
            <span className="text-caption text-muted">Conversations</span>
            <button
              onClick={startNewConversation}
              className="text-caption text-muted hover:text-content transition-colors cursor-pointer"
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-[12px] transition-colors cursor-pointer ${
                  conv.id === conversationId ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                <div className="text-caption text-content truncate">
                  {conv.title}{conv.location ? ` · ${conv.location}` : ''}
                </div>
                <div className="text-caption text-muted truncate mt-0.5">
                  {conv.messages?.find((m: Message) => m.role === 'user')?.content || 'No messages'}
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-caption text-muted px-3 py-2">No conversations yet</p>
            )}
          </div>
        </div>
        <div className="flex-1" onClick={() => setSidebarOpen(false)} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-1 py-4 pt-14" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 16px, black)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 16px, black)' }}>
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
                  style={animateBubbles ? { animation: 'bubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' } : undefined}
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
                animate={animateBubbles}
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
                className="shrink-0 px-3 py-1.5 text-caption tablet:px-4 tablet:py-2.5 tablet:text-body text-black/45 dark:text-white/45 rounded-full hover:text-content transition-colors whitespace-nowrap cursor-pointer border border-dashed border-black/15 dark:border-white/15"
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
            <div className={`flex gap-2 items-end transition-all duration-300 ease-in-out ${iconsCollapsed ? 'overflow-hidden' : ''}`}
              style={shouldCollapse ? { width: '42px' } : undefined}
            >
              {/* Plus button — always in DOM, overlays first icon position */}
              <button
                type="button"
                onClick={() => setShowLinks(!showLinks)}
                className={`w-[42px] tablet:w-[45px] desktop:w-[48px] h-[42px] tablet:h-[45px] desktop:h-[48px] flex items-center justify-center rounded-full cursor-pointer shrink-0 transition-all duration-300 ease-in-out ${
                  shouldCollapse
                    ? `opacity-100 ${showLinks ? 'bg-black/10 dark:bg-white/10 rotate-45' : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5'}`
                    : 'opacity-0 pointer-events-none'
                } absolute left-0 bottom-0 z-10`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              {/* Social icons */}
              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={shouldCollapse ? undefined : link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-[42px] tablet:w-[45px] desktop:w-[48px] h-[42px] tablet:h-[45px] desktop:h-[48px] flex items-center justify-center rounded-full bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-content cursor-pointer shrink-0 transition-all duration-300 ease-in-out ${
                    shouldCollapse ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                  style={{
                    transitionDelay: shouldCollapse ? '0ms' : `${idx * 30}ms`,
                  }}
                >
                  <SocialIcon platform={link.platform} />
                </a>
              ))}
            </div>

            {showLinks && shouldCollapse && (
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
              const val = e.target.value
              setInput(val)
              const el = e.target
              el.style.height = 'auto'
              if (val.trim()) {
                el.style.height = el.scrollHeight + 'px'
                setIsMultiline(el.scrollHeight > 50)
              } else {
                setIsMultiline(false)
              }
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
