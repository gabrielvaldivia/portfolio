'use client'

import { useEffect, useMemo, useState } from 'react'
import { geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

type Message = { role: 'user' | 'assistant'; content: string }

type Conversation = {
  id: number
  title: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  messages?: Message[]
}

type Dot = { conv: Conversation; x: number; y: number }

const MAP_W = 960
const MAP_H = 500

function stripFollowups(text: string) {
  return text.replace(/\{\{FOLLOWUPS:[^}]+\}\}/g, '').trim()
}

export function ChatMap() {
  const [topology, setTopology] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/world-110m.json')
      .then((r) => r.json())
      .then(setTopology)
      .catch(() => {})
    fetch('/api/chat/conversations')
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => {})
  }, [])

  const projection = useMemo(
    () => geoEqualEarth().scale(170).translate([MAP_W / 2, MAP_H / 2 + 10]),
    [],
  )

  const countryPaths = useMemo(() => {
    if (!topology) return null
    const fc = feature(topology, topology.objects.countries as any) as any
    const path = geoPath(projection as any)
    return (fc.features as any[]).map((f, i) => ({ id: i, d: path(f) || '' }))
  }, [topology, projection])

  const dots: Dot[] = useMemo(() => {
    return conversations
      .map((c) => {
        if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return null
        const pt = projection([c.longitude, c.latitude])
        if (!pt) return null
        return { conv: c, x: pt[0], y: pt[1] }
      })
      .filter(Boolean) as Dot[]
  }, [conversations, projection])

  const selected = selectedId !== null ? dots.find((d) => d.conv.id === selectedId)?.conv ?? null : null

  return (
    <div className="relative w-full h-full overflow-hidden">
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block text-content"
        onClick={() => setSelectedId(null)}
      >
        <g className="text-muted opacity-60">
          {countryPaths?.map((c) => (
            <path key={c.id} d={c.d} fill="none" stroke="currentColor" strokeWidth={0.4} />
          ))}
        </g>
        <g>
          {dots.map((d) => {
            const active = d.conv.id === selectedId
            return (
              <g
                key={d.conv.id}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId(d.conv.id)
                }}
              >
                <circle cx={d.x} cy={d.y} r={active ? 5 : 3.5} fill="currentColor" />
                {active && (
                  <circle cx={d.x} cy={d.y} r={10} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.6} />
                )}
                {/* Hit area */}
                <circle cx={d.x} cy={d.y} r={14} fill="transparent" />
              </g>
            )
          })}
        </g>
      </svg>

      {selected && (
        <div className="absolute top-4 right-4 w-[340px] max-w-[calc(100%-32px)] max-h-[calc(100%-32px)] bg-background border border-border rounded-[16px] shadow-lg flex flex-col z-10">
          <div className="flex items-start justify-between gap-2 p-4 pb-3 border-b border-border">
            <div className="min-w-0">
              <div className="text-body font-medium text-content truncate">{selected.title}</div>
              {selected.location && (
                <div className="text-caption text-muted truncate mt-0.5">{selected.location}</div>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
          <a
            href={`/chat/${selected.id}`}
            className="block text-center px-4 py-3 text-[13px] text-muted hover:text-content border-t border-border transition-colors"
          >
            Open chat →
          </a>
        </div>
      )}
    </div>
  )
}
