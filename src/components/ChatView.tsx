'use client'

import Link from 'next/link'

type View = 'chat' | 'map'

export function ChatView({
  view,
  chatHref = '/chat/new',
  children,
}: {
  view: View
  /** Where "Chat" tab navigates to (defaults to /chat/new). */
  chatHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative h-full">
      {/* Segmented control */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 inline-flex items-center h-10 bg-background-alt-hover dark:bg-white/[0.08] backdrop-blur-xl rounded-full p-1">
        <Link
          href={chatHref}
          scroll={false}
          className={`h-8 px-4 text-[13px] rounded-full transition-colors cursor-pointer flex items-center ${
            view === 'chat'
              ? 'bg-background dark:bg-white text-content dark:text-black'
              : 'text-muted hover:text-content'
          }`}
        >
          Chat
        </Link>
        <Link
          href="/chat/map"
          scroll={false}
          className={`h-8 px-4 text-[13px] rounded-full transition-colors cursor-pointer flex items-center ${
            view === 'map'
              ? 'bg-background dark:bg-white text-content dark:text-black'
              : 'text-muted hover:text-content'
          }`}
        >
          Map
        </Link>
      </div>
      {children}
    </div>
  )
}
