'use client'

import { useState, type ComponentProps } from 'react'
import { Chat } from './Chat'
import { ChatMap } from './ChatMap'

type Props = Omit<ComponentProps<typeof Chat>, 'persistentSidebar'>

export function ChatView(props: Props) {
  const [view, setView] = useState<'chat' | 'map'>('chat')

  return (
    <div className="relative h-full">
      {/* Segmented control */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 inline-flex bg-background-alt-hover dark:bg-white/[0.08] rounded-full p-1">
        <button
          type="button"
          onClick={() => setView('chat')}
          className={`px-4 py-1 text-[13px] rounded-full transition-colors cursor-pointer ${
            view === 'chat' ? 'bg-background text-content' : 'text-muted hover:text-content'
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          className={`px-4 py-1 text-[13px] rounded-full transition-colors cursor-pointer ${
            view === 'map' ? 'bg-background text-content' : 'text-muted hover:text-content'
          }`}
        >
          Map
        </button>
      </div>

      {view === 'chat' ? (
        <Chat {...props} persistentSidebar />
      ) : (
        <ChatMap />
      )}
    </div>
  )
}
