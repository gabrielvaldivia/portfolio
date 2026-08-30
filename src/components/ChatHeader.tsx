'use client'

import { usePathname } from 'next/navigation'
import { SegmentedControl } from '@/components/SegmentedControl'

function SidebarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  )
}

export function ChatHeader() {
  const pathname = usePathname()
  const isMap = pathname === '/chat/map'
  const chatHref = isMap ? '/chat/new' : pathname

  return (
    <header className="chat-header-content pointer-events-none absolute inset-x-0 top-0 z-50 h-[94px] tablet:h-[114px]">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('chat:toggle-sidebar'))}
        aria-label="Toggle conversation sidebar"
        title="Toggle conversation sidebar"
        className="chat-sidebar-toggle pointer-events-auto absolute left-4 top-4 z-30 flex size-10 cursor-pointer items-center justify-center rounded-full bg-floating text-muted backdrop-blur-[40px] transition-[color,background-color,transform] duration-200 hover:bg-hover hover:text-content tablet:left-10 tablet:top-10"
      >
        <SidebarIcon />
      </button>

      <SegmentedControl
        ariaLabel="Chat view"
        className="chat-view-toggle pointer-events-auto absolute left-1/2 top-4 z-30 -translate-x-1/2 tablet:top-10"
        items={[
          { href: chatHref, label: 'Chat', selected: !isMap, scroll: false },
          { href: '/chat/map', label: 'Map', selected: isMap, scroll: false },
        ]}
      />
    </header>
  )
}
