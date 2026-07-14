'use client'

import { useCallback, useEffect, useState } from 'react'

let sidebarOpenSnapshot: boolean | null = null

export function useChatSidebar(enabled = true) {
  const [sidebarOpen, setSidebarOpenState] = useState(() => sidebarOpenSnapshot ?? false)

  const setSidebarOpen = useCallback((value: boolean | ((open: boolean) => boolean)) => {
    setSidebarOpenState((open) => {
      const nextOpen = typeof value === 'function' ? value(open) : value
      sidebarOpenSnapshot = nextOpen
      return nextOpen
    })
  }, [])

  useEffect(() => {
    if (!enabled) return

    const desktop = window.matchMedia('(min-width: 1280px)')
    if (sidebarOpenSnapshot === null) setSidebarOpen(desktop.matches)

    const handleBreakpointChange = (event: MediaQueryListEvent) => setSidebarOpen(event.matches)
    const handleToggle = () => setSidebarOpen((open) => !open)
    desktop.addEventListener('change', handleBreakpointChange)
    window.addEventListener('chat:toggle-sidebar', handleToggle)
    return () => {
      desktop.removeEventListener('change', handleBreakpointChange)
      window.removeEventListener('chat:toggle-sidebar', handleToggle)
    }
  }, [enabled, setSidebarOpen])

  return [sidebarOpen, setSidebarOpen] as const
}
