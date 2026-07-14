'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Map, Marker } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ConversationSidebarList } from './ConversationSidebarList'
import {
  loadConversation as loadConversationById,
  loadConversationMarkers,
  useConversationSummaries,
  type ConversationSummary,
} from '@/lib/conversationSummaries'
import { useChatSidebar } from '@/lib/useChatSidebar'

type MapboxGL = (typeof import('mapbox-gl'))['default']

function stripFollowups(text: string) {
  return text.replace(/\{\{FOLLOWUPS:[^}]+\}\}/g, '').trim()
}

function formatDateTime(d: string | Date, tz?: string | null) {
  const date = new Date(d)
  const dateOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(tz ? { timeZone: tz } : {}),
  }
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  }
  const datePart = new Intl.DateTimeFormat('en-US', dateOpts).format(date)
  const timePart = new Intl.DateTimeFormat('en-US', timeOpts).format(date)
  return `${datePart} · ${timePart}`
}

function prefersDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ChatMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapboxRef = useRef<MapboxGL | null>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const selectionRequestRef = useRef(0)
  const {
    items: conversations,
    loading: conversationsLoading,
    hasMore: hasMoreConversations,
    loadMore: loadMoreConversations,
  } = useConversationSummaries()
  const [mapPoints, setMapPoints] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useChatSidebar()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 809px)')
    const desktopSidebar = window.matchMedia('(min-width: 810px)')
    document.body.classList.toggle('chat-mobile-sidebar-open', sidebarOpen && mobile.matches)
    document.body.classList.toggle('chat-desktop-sidebar-open', sidebarOpen && desktopSidebar.matches)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('chat-mobile-sidebar-open', 'chat-desktop-sidebar-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [sidebarOpen])

  // Load lightweight marker coordinates separately from the paginated sidebar.
  useEffect(() => {
    loadConversationMarkers()
      .then(setMapPoints)
      .catch(() => {})
  }, [])

  // Init map
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return
    const containerEl = container
    let disposed = false
    let cleanup: (() => void) | null = null

    async function initMap() {
      const mapbox = (await import('mapbox-gl')).default
      if (disposed) return

      mapbox.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
      mapboxRef.current = mapbox

      if (!mapbox.accessToken) {
        console.warn('NEXT_PUBLIC_MAPBOX_TOKEN is not set — map will be blank.')
        return
      }

      const map = new mapbox.Map({
        container: containerEl,
        style: prefersDark() ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
        projection: 'mercator',
        center: [10, 25],
        zoom: 1.1,
        attributionControl: false,
        logoPosition: 'bottom-left',
      })
      map.addControl(new mapbox.AttributionControl({ compact: true }), 'bottom-right')
      map.on('load', () => map.resize())
      mapRef.current = map
      setMapReady(true)

      // Force a resize on size changes of the container (tab switches can mount
      // with stale dimensions; this keeps the canvas aligned to the container).
      const ro = new ResizeObserver(() => map.resize())
      ro.observe(containerEl)

      // Follow OS theme changes
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onThemeChange = (e: MediaQueryListEvent) => {
        map.setStyle(e.matches ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11')
      }
      mq.addEventListener('change', onThemeChange)

      cleanup = () => {
        ro.disconnect()
        mq.removeEventListener('change', onThemeChange)
        map.remove()
        mapRef.current = null
        mapboxRef.current = null
      }
    }

    initMap().catch(() => {})

    return () => {
      disposed = true
      cleanup?.()
      setMapReady(false)
    }
  }, [])

  // Plot markers whenever conversations change
  useEffect(() => {
    const map = mapRef.current
    const mapbox = mapboxRef.current
    if (!map || !mapbox) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    mapPoints.forEach((c) => {
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return
      // Outer element — Mapbox owns its transform (for lat/lng positioning).
      // Inner dot handles hover scaling so we never clobber the positioning.
      const el = document.createElement('div')
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      el.setAttribute('aria-label', c.title)
      el.style.cssText = 'cursor:pointer;width:14px;height:14px;display:flex;align-items:center;justify-content:center;'
      const dot = document.createElement('div')
      dot.style.cssText =
        'width:10px;height:10px;border-radius:50%;background:var(--color-content);border:2px solid var(--color-background);transition:transform 150ms ease, box-shadow 150ms ease;box-sizing:border-box;'
      el.appendChild(dot)
      el.addEventListener('mouseenter', () => {
        dot.style.transform = 'scale(1.5)'
      })
      el.addEventListener('mouseleave', () => {
        dot.style.transform = ''
      })
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        void selectConversation(c)
      })
      const marker = new mapbox.Marker({ element: el, anchor: 'center' })
        .setLngLat([c.longitude, c.latitude])
        .addTo(map)
      markersRef.current.push(marker)
    })
  }, [mapPoints, mapReady])

  async function selectConversation(conversation: ConversationSummary) {
    const requestId = ++selectionRequestRef.current
    setSelectedId(conversation.id)
    setSelectedConversation(conversation)
    if (window.matchMedia('(max-width: 809px)').matches) setSidebarOpen(false)
    if (typeof conversation.longitude === 'number' && typeof conversation.latitude === 'number') {
      mapRef.current?.flyTo({
        center: [conversation.longitude, conversation.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 5),
        essential: true,
      })
    }
    try {
      const loaded = await loadConversationById(conversation.id)
      if (selectionRequestRef.current === requestId) setSelectedConversation(loaded)
    } catch {
      // Keep the lightweight metadata visible if the transcript request fails.
    }
  }

  const sidebarInner = (
    <>
      <div className="px-3 pb-4 pt-1">
        <span className="text-body font-medium text-content">Conversations</span>
      </div>
      <ConversationSidebarList
        conversations={conversations}
        selectedId={selectedId}
        loading={conversationsLoading}
        hasMore={hasMoreConversations}
        onLoadMore={loadMoreConversations}
        onSelect={(conversation) => void selectConversation(conversation)}
      />
    </>
  )

  return (
    <div className="flex size-full overflow-hidden">
      {mounted && createPortal(
        <div className={`fixed inset-0 z-50 tablet:hidden ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <button
            type="button"
            aria-label="Close conversation sidebar"
            onClick={() => setSidebarOpen(false)}
            className={`fixed inset-0 bg-black/20 transition-[opacity,translate] duration-200 ease-out ${sidebarOpen ? 'translate-x-[var(--chat-drawer-width)] opacity-100' : 'translate-x-0 opacity-0'}`}
          />
          <aside
            aria-label="Conversation history"
            className={`fixed inset-y-0 left-0 z-10 flex flex-col bg-background px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ width: 'var(--chat-drawer-width)' }}
          >
            {sidebarInner}
          </aside>
        </div>,
        document.body,
      )}

      <aside
        aria-label="Conversation history"
        className={`hidden w-[280px] shrink-0 flex-col bg-background-alt-hover px-2 py-8 transition-[margin-left] duration-200 ease-out tablet:flex ${sidebarOpen ? 'ml-0' : '-ml-[280px]'}`}
      >
        {sidebarInner}
      </aside>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div ref={containerRef} className="size-full" />

        {selectedConversation && (
        <div className="map-conversation-panel absolute bottom-2 left-2 right-2 z-10 flex max-h-[calc(50%-8px)] flex-col rounded-[12px] bg-background shadow-lg">
          <div className="flex items-start justify-between gap-2 p-4 pb-3">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-content truncate">
                {selectedConversation.location || 'Unknown location'}
              </div>
              {selectedConversation.createdAt && (
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {formatDateTime(selectedConversation.createdAt, selectedConversation.timezone)}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                selectionRequestRef.current += 1
                setSelectedId(null)
                setSelectedConversation(null)
              }}
              aria-label="Close"
              className="shrink-0 w-6 h-6 flex items-center justify-center text-muted hover:text-content transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-3 min-h-0">
            {!selectedConversation.messages && (
              <p className="text-[14px] text-muted">Loading conversation…</p>
            )}
            {(selectedConversation.messages || []).map((m, i) => {
              const text = stripFollowups(m.content)
              if (!text) return null
              return (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-[14px] px-3 py-2 text-[14px] leading-snug whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-content text-inverse'
                        : 'bg-background-alt text-content'
                    }`}
                  >
                    {text}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
