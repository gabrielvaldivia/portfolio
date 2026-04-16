'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

type Message = { role: 'user' | 'assistant'; content: string }

type Conversation = {
  id: number
  title: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  messages?: Message[]
  createdAt?: string
  timezone?: string | null
}

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
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Load conversations
  useEffect(() => {
    fetch('/api/chat/conversations')
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => {})
  }, [])

  // Init map
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return
    if (!mapboxgl.accessToken) {
      console.warn('NEXT_PUBLIC_MAPBOX_TOKEN is not set — map will be blank.')
      return
    }
    const map = new mapboxgl.Map({
      container,
      style: prefersDark() ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      projection: 'mercator',
      center: [10, 25],
      zoom: 1.1,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('load', () => map.resize())
    mapRef.current = map

    // Force a resize on size changes of the container (tab switches can mount
    // with stale dimensions; this keeps the canvas aligned to the container).
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(container)

    // Follow OS theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onThemeChange = (e: MediaQueryListEvent) => {
      map.setStyle(e.matches ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11')
    }
    mq.addEventListener('change', onThemeChange)

    return () => {
      ro.disconnect()
      mq.removeEventListener('change', onThemeChange)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Plot markers whenever conversations change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    conversations.forEach((c) => {
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
        setSelectedId(c.id)
      })
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([c.longitude, c.latitude])
        .addTo(map)
      markersRef.current.push(marker)
    })
  }, [conversations])

  const selected =
    selectedId !== null ? conversations.find((c) => c.id === selectedId) || null : null

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {selected && (
        <div className="absolute bottom-2 left-2 right-2 max-h-[calc(50%-8px)] rounded-[12px] tablet:bottom-auto tablet:left-auto tablet:top-4 tablet:right-4 tablet:w-[340px] tablet:max-w-[calc(100%-32px)] tablet:max-h-[calc(100%-32px)] tablet:rounded-[14px] bg-background shadow-lg flex flex-col z-10">
          <div className="flex items-start justify-between gap-2 p-4 pb-3">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-content truncate">
                {selected.location || 'Unknown location'}
              </div>
              {selected.createdAt && (
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {formatDateTime(selected.createdAt, selected.timezone)}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="shrink-0 w-6 h-6 flex items-center justify-center text-muted hover:text-content transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-3 min-h-0">
            {(selected.messages || []).map((m, i) => {
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
  )
}
