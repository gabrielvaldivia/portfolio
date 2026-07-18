'use client'

import { useEffect, useSyncExternalStore } from 'react'

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationSummary = {
  id: number
  title: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  preview?: string
  messages?: ConversationMessage[]
  createdAt?: string
  updatedAt?: string
  timezone?: string | null
}

type Cursor = { updatedAt: string; id: number } | null
type SummaryState = {
  items: ConversationSummary[]
  nextCursor: Cursor
  loaded: boolean
  loading: boolean
}

const EMPTY_STATE: SummaryState = { items: [], nextCursor: null, loaded: false, loading: false }
let state: SummaryState = EMPTY_STATE
let pendingPage: Promise<void> | null = null
const pendingConversations = new Map<number, Promise<ConversationSummary>>()
const conversationCache = new Map<number, ConversationSummary>()
let markerCache: ConversationSummary[] | null = null
let pendingMarkers: Promise<ConversationSummary[]> | null = null
const listeners = new Set<() => void>()

function emit(nextState: SummaryState) {
  state = nextState
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function mergeItems(incoming: ConversationSummary[]) {
  const merged = new Map(state.items.map((item) => [item.id, item]))
  incoming.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }))
  return Array.from(merged.values())
}

export function loadMoreConversationSummaries() {
  if (pendingPage) return pendingPage
  if (state.loaded && !state.nextCursor) return Promise.resolve()

  emit({ ...state, loading: true })
  const params = new URLSearchParams({ summary: '1', limit: '40' })
  if (state.nextCursor) {
    params.set('cursorUpdatedAt', state.nextCursor.updatedAt)
    params.set('cursorId', String(state.nextCursor.id))
  }

  pendingPage = fetch(`/api/chat/conversations?${params}`)
    .then((response) => {
      if (!response.ok) throw new Error('Conversation summaries unavailable')
      return response.json()
    })
    .then((result: { items: ConversationSummary[]; nextCursor: Cursor }) => {
      emit({
        items: mergeItems(result.items),
        nextCursor: result.nextCursor,
        loaded: true,
        loading: false,
      })
    })
    .catch(() => emit({ ...state, loaded: true, loading: false }))
    .finally(() => {
      pendingPage = null
    })

  return pendingPage
}

export function loadConversation(id: number) {
  const cached = conversationCache.get(id)
  if (cached?.messages) return Promise.resolve(cached)
  const pending = pendingConversations.get(id)
  if (pending) return pending

  const request = fetch(`/api/chat/conversations/${id}`)
    .then((response) => {
      if (!response.ok) throw new Error('Conversation unavailable')
      return response.json() as Promise<ConversationSummary>
    })
    .then((conversation) => {
      conversationCache.set(id, conversation)
      if (state.items.some((item) => item.id === id)) {
        emit({
          ...state,
          items: state.items.map((item) => item.id === id ? { ...item, ...conversation } : item),
        })
      }
      return conversation
    })
    .finally(() => pendingConversations.delete(id))

  pendingConversations.set(id, request)
  return request
}

export function cacheConversation(conversation: ConversationSummary) {
  conversationCache.set(conversation.id, conversation)
  emit({
    ...state,
    items: mergeItems([{
      ...conversation,
      preview: conversation.preview || conversation.messages?.find((message) => message.role === 'user')?.content || '',
    }]),
  })
}

export function loadConversationMarkers() {
  if (markerCache) return Promise.resolve(markerCache)
  if (pendingMarkers) return pendingMarkers

  pendingMarkers = fetch('/api/chat/conversations?summary=markers')
    .then((response) => {
      if (!response.ok) throw new Error('Conversation markers unavailable')
      return response.json() as Promise<ConversationSummary[]>
    })
    .then((markers) => {
      markerCache = markers
      return markers
    })
    .finally(() => {
      pendingMarkers = null
    })

  return pendingMarkers
}

export function useConversationSummaries() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY_STATE)

  useEffect(() => {
    if (!snapshot.loaded && !snapshot.loading) void loadMoreConversationSummaries()
  }, [snapshot.loaded, snapshot.loading])

  return {
    ...snapshot,
    hasMore: Boolean(snapshot.nextCursor) || !snapshot.loaded,
    loadMore: loadMoreConversationSummaries,
  }
}
