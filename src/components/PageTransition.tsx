'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChat = pathname.startsWith('/chat')
  const transitionKey = isChat ? 'chat' : pathname

  useEffect(() => {
    if (!isChat) return

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const rootStyle = document.documentElement.style
    const previousViewportHeight = rootStyle.getPropertyValue('--chat-viewport-height')
    const previousViewportTop = rootStyle.getPropertyValue('--chat-viewport-top')
    const viewport = window.visualViewport

    const updateViewport = () => {
      rootStyle.setProperty('--chat-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
      rootStyle.setProperty('--chat-viewport-top', `${viewport?.offsetTop ?? 0}px`)
    }

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    updateViewport()
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)

    return () => {
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      if (previousViewportHeight) rootStyle.setProperty('--chat-viewport-height', previousViewportHeight)
      else rootStyle.removeProperty('--chat-viewport-height')
      if (previousViewportTop) rootStyle.setProperty('--chat-viewport-top', previousViewportTop)
      else rootStyle.removeProperty('--chat-viewport-top')
    }
  }, [isChat])

  return (
    <main key={transitionKey} className={isChat ? '' : 'page-transition'}>
      {children}
    </main>
  )
}
