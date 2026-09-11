'use client'

import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={8000}
      visibleToasts={1}
      closeButton={false}
      swipeDirections={['left', 'right', 'top', 'bottom']}
      pauseWhenPageIsHidden
      offset={{
        bottom: 'max(24px, env(safe-area-inset-bottom))',
        right: 'max(24px, env(safe-area-inset-right))',
      }}
      mobileOffset={{
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        left: 'max(16px, env(safe-area-inset-left))',
        right: 'max(16px, env(safe-area-inset-right))',
      }}
      style={{
        zIndex: 50,
        fontFamily: 'inherit',
        transition: 'none',
        '--normal-bg': 'var(--color-content)',
        '--normal-text': 'var(--color-inverse)',
        '--normal-border': 'var(--color-content)',
      } as CSSProperties}
      toastOptions={{
        style: { borderRadius: 12, fontSize: 14, lineHeight: 1.5, transition: 'none', animation: 'none' },
        classNames: {
          toast: 'select-none cursor-grab active:cursor-grabbing',
          title: '!font-normal text-pretty',
        },
      }}
    />
  )
}
