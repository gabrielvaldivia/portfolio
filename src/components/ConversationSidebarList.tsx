'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getConversationTitle } from '@/lib/conversationTitle'
import type { ConversationSummary } from '@/lib/conversationSummaries'

const ROW_HEIGHT = 68
const ROW_CONTENT_HEIGHT = 64
const OVERSCAN = 5

export function ConversationSidebarList({
  conversations,
  selectedId,
  loading,
  hasMore,
  onLoadMore,
  onSelect,
}: {
  conversations: ConversationSummary[]
  selectedId: number | null
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSelect: (conversation: ConversationSummary) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const updateHeight = () => setViewportHeight(element.clientHeight)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2
    return { start, end: Math.min(conversations.length, start + Math.max(visibleCount, 15)) }
  }, [conversations.length, scrollTop, viewportHeight])

  function handleScroll() {
    const element = scrollRef.current
    if (!element) return
    setScrollTop(element.scrollTop)
    if (hasMore && !loading && element.scrollHeight - element.scrollTop - element.clientHeight < ROW_HEIGHT * 5) {
      onLoadMore()
    }
  }

  const loadingHeight = loading || hasMore ? 40 : 0

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)',
      }}
    >
      <div className="relative" style={{ height: conversations.length * ROW_HEIGHT + loadingHeight }}>
        {conversations.slice(visibleRange.start, visibleRange.end).map((conversation, offset) => {
          const index = visibleRange.start + offset
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation)}
              className={`absolute inset-x-0 w-full rounded-[12px] px-3 py-2.5 text-left transition-colors cursor-pointer ${
                conversation.id === selectedId
                  ? 'bg-black/5 dark:bg-white/5'
                  : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }`}
              style={{ top: index * ROW_HEIGHT, height: ROW_CONTENT_HEIGHT }}
            >
              <div className="truncate text-[13px] text-muted">{getConversationTitle(conversation.title)}</div>
              <div className="mt-0.5 truncate text-[16px] text-content">
                {conversation.preview || conversation.messages?.find((message) => message.role === 'user')?.content || 'No messages'}
              </div>
            </button>
          )
        })}
        {loading && (
          <p className="absolute inset-x-0 px-3 py-2 text-caption text-muted" style={{ top: conversations.length * ROW_HEIGHT }}>
            Loading…
          </p>
        )}
        {!loading && conversations.length === 0 && (
          <p className="px-3 py-2 text-caption text-muted">No conversations yet</p>
        )}
      </div>
    </div>
  )
}
