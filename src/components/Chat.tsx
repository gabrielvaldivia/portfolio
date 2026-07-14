'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SocialIcon } from './Icons'
import { Avatar } from './Avatar'
import { ConversationSidebarList } from './ConversationSidebarList'
import { cn } from '@/lib/cn'
import {
  cacheConversation,
  loadConversation as loadConversationById,
  useConversationSummaries,
  type ConversationSummary,
} from '@/lib/conversationSummaries'
import { useChatSidebar } from '@/lib/useChatSidebar'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type FAQItem = {
  question: string
  answer: string
  showAsPill?: boolean
}

type ProjectLink = {
  title: string
  slug: string
}

type SocialLink = {
  platform: string
  url: string
}

type BlogPost = {
  title: string
  url: string | null
}

type PersonLink = {
  name: string
  linkedin: string
}

type TalkLink = {
  title: string
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

function linkify(text: string, projects: ProjectLink[], blogPosts: BlogPost[] = [], people: PersonLink[] = [], sideProjects: { title: string; slug: string }[] = [], talks: TalkLink[] = []): React.ReactNode[] {
  text = stripMarkdown(text)

  const sortedProjects = [...projects].sort((a, b) => b.title.length - a.title.length)
  const projectNames = sortedProjects.map((p) => p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const sortedPeople = [...people].sort((a, b) => b.name.length - a.name.length)
  const peopleNames = sortedPeople.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const sortedSideProjects = [...sideProjects].sort((a, b) => b.title.length - a.title.length)
  const sideProjectNames = sortedSideProjects.map((p) => p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const sortedTalks = [...talks].sort((a, b) => b.title.length - a.title.length)
  const talkNames = sortedTalks.map((t) => t.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  // Match: [text](url), emails, bare URLs, project names, side project names, talk names, or people names
  const mdLink = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/
  const email = /[\w.-]+@[\w.-]+\.\w+/
  const url = /https?:\/\/[^\s),]+/
  const projectPat = projectNames.length ? new RegExp(`\\b(${projectNames.join('|')})\\b`, 'i') : null
  const sideProjectPat = sideProjectNames.length ? new RegExp(`\\b(${sideProjectNames.join('|')})\\b`, 'i') : null
  const talkPat = talkNames.length ? new RegExp(`"(${talkNames.join('|')})"`, 'i') : null
  const peoplePat = peopleNames.length ? new RegExp(`\\b(${peopleNames.join('|')})\\b`, 'i') : null

  const patterns = [mdLink.source, email.source, url.source]
  if (projectPat) patterns.push(projectPat.source)
  if (sideProjectPat) patterns.push(sideProjectPat.source)
  if (talkPat) patterns.push(talkPat.source)
  if (peoplePat) patterns.push(peoplePat.source)
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
      const linkTitle = mdMatch[1]
      let linkUrl = mdMatch[2]
      // ALWAYS use URL from blog index — never trust the model's URL
      const titleLower = linkTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '')
      const blogMatch = blogPosts.find((b) => {
        if (!b.url) return false
        const bt = b.title.toLowerCase().replace(/[^a-z0-9\s]/g, '')
        return bt === titleLower || bt.includes(titleLower) || titleLower.includes(bt)
      })
      if (blogMatch?.url) linkUrl = blogMatch.url
      parts.push(
        <a key={key++} href={linkUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {linkTitle}
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
        const sideProject = sortedSideProjects.find((p) => p.title.toLowerCase() === matched.toLowerCase())
        if (sideProject) {
          parts.push(
            <a key={key++} href={`/playground/${sideProject.slug}`} style={linkStyle}>
              {matched}
            </a>,
          )
        } else {
          // Check for talk/interview titles (matched includes surrounding quotes)
          const talkTitleMatch = matched.match(/^"(.+)"$/)
          const talkTitle = talkTitleMatch ? talkTitleMatch[1] : null
          const talk = talkTitle ? sortedTalks.find((t) => t.title.toLowerCase() === talkTitle.toLowerCase()) : null
          if (talk) {
            parts.push(
              <span key={key++}>
                &quot;<a href={talk.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>{talkTitle}</a>&quot;
              </span>,
            )
          } else {
            const person = sortedPeople.find((p) => p.name.toLowerCase() === matched.toLowerCase())
            if (person) {
              parts.push(
                <a key={key++} href={person.linkedin} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  {matched}
                </a>,
              )
            } else {
              parts.push(matched)
            }
          }
        }
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
  avatarUrlDark,
  topMargin,
  projects,
  people = [],
  sideProjects = [],
  blogPosts = [],
  talks = [],
  animate = true,
}: {
  paragraphs: string[]
  avatarUrl?: string
  avatarUrlDark?: string
  topMargin: string
  projects: ProjectLink[]
  people?: PersonLink[]
  sideProjects?: { title: string; slug: string }[]
  blogPosts?: BlogPost[]
  talks?: TalkLink[]
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
    <div className={`flex items-end gap-3 ${topMargin}`}>
      {avatarUrl && (
        <Avatar
          name="Gabriel Valdivia"
          photo={{ url: avatarUrl }}
          photoDark={avatarUrlDark ? { url: avatarUrlDark } : undefined}
          size={48}
          showTooltip={false}
          className="!hidden tablet:!block"
        />
      )}
      <div className="flex flex-col gap-1 max-w-[85%]">
        {visible.map((text, pi) => (
          <div
            key={pi}
            className="w-fit px-4 py-2.5 text-body rounded-[23px] bg-background dark:bg-white/10 text-content chat-bubble"
            style={animate ? { animation: 'bubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' } : undefined}
          >
            {text ? (
              linkify(text, projects, blogPosts, people, sideProjects, talks)
            ) : (
              <span className="inline-flex items-center gap-1 py-1">
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

function ScrollMask({ children, className = '', extraStyle }: { children: React.ReactNode; className?: string; extraStyle?: React.CSSProperties }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [maskLeft, setMaskLeft] = useState(false)
  const [maskRight, setMaskRight] = useState(false)

  const updateMask = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth
    setMaskLeft(hasOverflow && el.scrollLeft > 2)
    setMaskRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    updateMask()
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(updateMask)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateMask])

  const mask = maskLeft && maskRight
    ? 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)'
    : maskLeft
    ? 'linear-gradient(to right, transparent, black 40px, black)'
    : maskRight
    ? 'linear-gradient(to right, black, black calc(100% - 40px), transparent)'
    : 'none'

  return (
    <div
      ref={scrollRef}
      onScroll={updateMask}
      className={`overflow-x-auto scrollbar-hide ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask, ...extraStyle }}
    >
      {children}
    </div>
  )
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

function getSuggestedQuestions(faqItems: FAQItem[]) {
  return faqItems
    .filter((item) => item.showAsPill !== false)
    .map((item) => item.question)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
}

export function Chat({
  faqItems,
  avatarUrl,
  avatarUrlDark,
  projects = [],
  sideProjects = [],
  people = [],
  socialLinks = [],
  talks = [],
  persistentSidebar = false,
  initialConversationId = null,
}: {
  faqItems: FAQItem[]
  avatarUrl?: string
  avatarUrlDark?: string
  projects?: ProjectLink[]
  sideProjects?: { title: string; slug: string }[]
  people?: PersonLink[]
  socialLinks?: SocialLink[]
  talks?: TalkLink[]
  persistentSidebar?: boolean
  initialConversationId?: number | null
}) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: GREETINGS[0] }])
  const [showLinks, setShowLinks] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [iconsCollapsed, setIconsCollapsed] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useChatSidebar(persistentSidebar)
  const [hasScrolled, setHasScrolled] = useState(false)
  const {
    items: conversations,
    loading: conversationsLoading,
    hasMore: hasMoreConversations,
    loadMore: loadMoreConversations,
  } = useConversationSummaries()
  const [conversationId, setConversationIdRaw] = useState<number | null>(initialConversationId)

  useEffect(() => {
    if (!persistentSidebar || !sidebarOpen) {
      document.body.classList.remove('chat-mobile-sidebar-open')
      return
    }

    const mobile = window.matchMedia('(max-width: 809px)')
    if (!mobile.matches) return

    document.body.classList.add('chat-mobile-sidebar-open')
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('chat-mobile-sidebar-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [persistentSidebar, sidebarOpen])

  useEffect(() => {
    if (!persistentSidebar) return

    const sidebarLayout = window.matchMedia('(min-width: 810px)')
    const syncDesktopSidebarClass = () => {
      document.body.classList.toggle(
        'chat-desktop-sidebar-open',
        sidebarOpen && sidebarLayout.matches,
      )
    }

    syncDesktopSidebarClass()
    sidebarLayout.addEventListener('change', syncDesktopSidebarClass)
    return () => {
      document.body.classList.remove('chat-desktop-sidebar-open')
      sidebarLayout.removeEventListener('change', syncDesktopSidebarClass)
    }
  }, [persistentSidebar, sidebarOpen])

  const setConversationId = useCallback(
    (id: number | null) => {
      setConversationIdRaw(id)
      if (typeof window === 'undefined') return
      if (id !== null) sessionStorage.setItem('conversationId', String(id))
      else sessionStorage.removeItem('conversationId')
      if (persistentSidebar) {
        const newPath = id !== null ? `/chat/${id}` : '/chat/new'
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath)
        }
      }
    },
    [persistentSidebar],
  )
  const [animateBubbles, setAnimateBubbles] = useState(true)
  const linksRef = useRef<HTMLDivElement>(null)
  const hasRandomized = useRef(false)
  const locationRef = useRef('')
  const retryRef = useRef(0)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const blogIndexRequested = useRef(false)
  const [suggestions] = useState<string[]>(() => getSuggestedQuestions(faqItems))

  useEffect(() => {
    // Resolve the initial conversation id. On the dedicated /chat page
    // the URL is authoritative (via initialConversationId). Elsewhere,
    // fall back to the ?chat= query param or sessionStorage.
    const urlParams = new URLSearchParams(window.location.search)
    const chatParam = urlParams.get('chat')
    const savedId = persistentSidebar
      ? initialConversationId !== null && initialConversationId !== undefined
        ? String(initialConversationId)
        : null
      : chatParam || null
    if (!hasRandomized.current && !savedId) {
      hasRandomized.current = true
      const random = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
      setMessages([{ role: 'assistant', content: random }])
    }
    // Fetch location for saved conversation titles.
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data) => {
        if (data.location) locationRef.current = data.location
      })
      .catch(() => {})
    // Restore conversation from session
    if (savedId) {
      setAnimateBubbles(false)
      fetch(`/api/chat/conversations/${savedId}`)
        .then((r) => r.json())
        .then((doc) => {
          if (doc.messages?.length) {
            cacheConversation(doc)
            const lastMsg = doc.messages[doc.messages.length - 1]
            if (lastMsg.role === 'assistant' && !lastMsg.content) {
              // Retry the failed response
              const withoutEmpty = doc.messages.filter((m: Message) => m.content)
              setMessages([...withoutEmpty, { role: 'assistant', content: '' }])
              setConversationId(doc.id)
              setIsStreaming(true)
              setTimeout(() => setAnimateBubbles(true), 100)
              fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: withoutEmpty }),
              }).then(async (res) => {
                const reader = res.body?.getReader()
                const decoder = new TextDecoder()
                let accumulated = ''
                while (reader) {
                  const { done, value } = await reader.read()
                  if (done) break
                  const chunk = decoder.decode(value)
                  for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                      try {
                        accumulated += JSON.parse(line.slice(6)).text
                        setMessages((prev) => {
                          const updated = [...prev]
                          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
                          return updated
                        })
                      } catch {}
                    }
                  }
                }
                setIsStreaming(false)
              }).catch(() => setIsStreaming(false))
            } else {
              setMessages(doc.messages)
              setConversationId(doc.id)
            }
          }
          setTimeout(() => setAnimateBubbles(true), 100)
        })
        .catch(() => setAnimateBubbles(true))
    }
  }, [])

  useEffect(() => {
    if (blogIndexRequested.current || blogPosts.length) return
    const hasAssistantLink = messages.some(
      (message) => message.role === 'assistant' && /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(message.content),
    )
    if (!hasAssistantLink) return

    blogIndexRequested.current = true
    fetch('https://gabos.vercel.app/api/search?q=')
      .then((r) => r.json())
      .then((posts) => setBlogPosts(posts))
      .catch(() => {})
  }, [blogPosts.length, messages])

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Also scroll when AssistantMessage reveals new paragraphs
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new MutationObserver(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return
    userScrolledUp.current = false
    retryRef.current = 0
    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMessage])

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      })

      clearTimeout(timeout)
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

      // If we got no content, retry once
      if (!accumulated) {
        retryRef.current++
        if (retryRef.current <= 2) {
          setMessages((prev) => prev.slice(0, -1))
          setIsStreaming(false)
          setTimeout(() => sendMessage(text), 500)
          return
        }
      }
    } catch {
      // On error/timeout, retry once
      retryRef.current++
      if (retryRef.current <= 2) {
        setMessages((prev) => prev.slice(0, -1))
        setIsStreaming(false)
        setTimeout(() => sendMessage(text), 500)
        return
      }
    }

    setIsStreaming(false)
  }

  // Save conversation after streaming completes (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (isStreaming) return
    if (messages.length < 2 || !messages.some((m) => m.role === 'user')) return

    // Debounce: wait 3 seconds before saving to batch rapid exchanges
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (conversationId) {
        fetch(`/api/chat/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
        }).catch(() => {})
      } else {
        const loc = locationRef.current
        const title = formatDate(new Date()) + (loc ? ` · ${loc}` : '')
        fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, location: loc, messages }),
        })
          .then((r) => r.json())
          .then((doc) => {
            if (doc.id) {
              cacheConversation(doc)
              setConversationId(doc.id)
            }
          })
          .catch(() => {})
      }
    }, 3000)
  }, [isStreaming])

  async function loadConversation(conv: ConversationSummary) {
    setAnimateBubbles(false)
    if (window.matchMedia('(max-width: 809px)').matches) setSidebarOpen(false)

    try {
      const loadedConversation = await loadConversationById(conv.id)

      // Delay setting messages until after the animation flag is committed.
      requestAnimationFrame(() => {
        setMessages(loadedConversation.messages || [])
        setConversationId(conv.id)
        requestAnimationFrame(() => setAnimateBubbles(true))
      })
    } catch {
      setAnimateBubbles(true)
    }
  }

  function startNewConversation() {
    const random = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
    setMessages([{ role: 'assistant', content: random }])
    setConversationId(null)
    if (window.matchMedia('(max-width: 809px)').matches) setSidebarOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const showSuggestions = messages.length === 1 && messages[0].role === 'assistant'

  // Extract follow-up questions from the last assistant message
  const followUps: string[] = (() => {
    if (isStreaming) return []
    const lastMsg = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastMsg?.content) return []
    const match = lastMsg.content.match(/\{\{FOLLOWUPS:\s*(.+?)\}\}/)
    if (!match) return []
    return match[1].split('|').map((q) => q.trim()).filter(Boolean)
  })()

  const sidebarInner = (
    <>
      <div className="flex items-center justify-between pt-1 pb-4 pl-3 pr-1">
        <span className="text-body font-medium text-content">Conversations</span>
        {conversationId && (
          <button
            type="button"
            onClick={startNewConversation}
            title="New chat"
            aria-label="New chat"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-content dark:hover:bg-white/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
      <ConversationSidebarList
        conversations={conversations}
        selectedId={conversationId}
        loading={conversationsLoading}
        hasMore={hasMoreConversations}
        onLoadMore={loadMoreConversations}
        onSelect={loadConversation}
      />
    </>
  )

  const chatBody = (
    <div className={`flex flex-col h-full relative ${persistentSidebar ? 'flex-1 min-w-0 px-5 tablet:px-8 pb-5 tablet:pb-8 pt-[94px] tablet:pt-[114px]' : ''}`}>

      {/* Mobile avatar header — hidden on the dedicated /chat page */}
      {avatarUrl && !persistentSidebar && (
        <div className="tablet:!hidden flex justify-center pt-2 pb-5 relative z-10">
          <Avatar
            name="Gabriel Valdivia"
            photo={{ url: avatarUrl }}
            photoDark={avatarUrlDark ? { url: avatarUrlDark } : undefined}
            size={32}
            showTooltip={false}
          />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto px-1 py-4 scrollbar-hide ${hasScrolled ? 'chat-scroll-mask' : ''}`}>
        <div className="mx-auto flex w-full max-w-[800px] flex-col">
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
                    className="w-fit max-w-[85%] px-4 py-2.5 text-body rounded-[23px] bg-blue-500 text-white chat-bubble"
                  >
                    {msg.content}
                  </div>
                </div>
              )
            }

            // Assistant: split into paragraphs, reveal with delay
            const paragraphs = msg.content
              ? msg.content.replace(/\{\{FOLLOWUPS:.*?\}\}/g, '').split(/\n\n+/).filter(Boolean)
              : ['']

            return (
              <AssistantMessage
                key={i}
                paragraphs={paragraphs}
                avatarUrl={avatarUrl}
                avatarUrlDark={avatarUrlDark}
                topMargin={topMargin}
                projects={projects}
                people={people}
                sideProjects={sideProjects}
                blogPosts={blogPosts}
                talks={talks}
                animate={animateBubbles}
              />
            )
          })}
        </div>
      </div>

      {/* Suggested pills */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mx-auto flex w-full max-w-[800px] flex-col items-start gap-2 px-1 pb-3">
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="w-fit px-3 py-1.5 text-caption tablet:px-4 tablet:py-2.5 tablet:text-body text-left text-black/45 dark:text-white/45 rounded-[16px] tablet:rounded-[20px] hover:text-content transition-colors cursor-pointer border border-dashed border-black/15 dark:border-white/15"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up pills */}
      {!showSuggestions && followUps.length > 0 && (
        <ScrollMask className="mx-auto w-full max-w-[800px] px-1 pb-1 tablet:pb-3" extraStyle={{ animation: 'bubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div className="flex gap-2 w-max">
            {followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="shrink-0 px-3 py-1.5 text-caption tablet:px-4 tablet:py-2.5 tablet:text-body text-black/45 dark:text-white/45 rounded-full hover:text-content transition-colors whitespace-nowrap cursor-pointer border border-dashed border-black/15 dark:border-white/15"
              >
                {q}
              </button>
            ))}
          </div>
        </ScrollMask>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[800px] items-end gap-3 pt-2">
        {socialLinks.length > 0 && (
          <div ref={linksRef} className="relative shrink-0 flex items-end">
            <div className={`flex items-end transition-all duration-300 ease-in-out ${iconsCollapsed ? 'overflow-hidden' : 'gap-2'}`}
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
            className="block w-full bg-black/[0.02] dark:bg-floating rounded-[23px] px-4 py-2.5 pr-11 text-body text-content placeholder:text-muted outline-none disabled:opacity-50 resize-none overflow-hidden"
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

  if (persistentSidebar) {
    return (
      <div className="relative h-full overflow-hidden">
          <div className={`absolute inset-0 z-40 tablet:hidden ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <button
              type="button"
              aria-label="Close conversation sidebar"
              onClick={() => setSidebarOpen(false)}
              className={`absolute inset-0 bg-black/20 dark:bg-black/60 transition-[opacity,translate] duration-200 ease-out ${sidebarOpen ? 'translate-x-[var(--chat-drawer-width)] opacity-100' : 'translate-x-0 opacity-0'}`}
            />
            <aside
              aria-label="Conversation history"
              className={`absolute inset-y-0 left-0 z-10 flex flex-col bg-background dark:bg-white/10 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
              style={{ width: 'var(--chat-drawer-width)' }}
            >
              {sidebarInner}
            </aside>
          </div>
        <div className={cn(
          'flex h-full flex-row transition-transform duration-200 ease-out tablet:translate-x-0',
          sidebarOpen ? 'translate-x-[var(--chat-drawer-width)]' : 'translate-x-0',
        )}>
          <aside
            className={`hidden w-[280px] shrink-0 flex-col bg-background-alt-hover px-2 py-5 transition-[margin-left] duration-300 ease-in-out dark:bg-white/[0.06] tablet:flex tablet:py-8 ${sidebarOpen ? 'ml-0' : '-ml-[280px]'}`}
          >
            {sidebarInner}
          </aside>
          {chatBody}
        </div>
      </div>
    )
  }

  return chatBody
}
