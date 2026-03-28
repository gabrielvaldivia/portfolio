'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Container } from './Container'

export function Footer({ copyright }: { copyright?: string }) {
  const pathname = usePathname()
  const year = new Date().getFullYear()
  const original = copyright || `© Copyright ${year}`
  const [flipped, setFlipped] = useState(false)

  if (pathname?.startsWith('/chat/')) return null

  return (
    <footer className="pt-5 pb-24 tablet:pb-20">
      <Container>
        <p
          className="text-muted text-sm font-mono uppercase tracking-[-0.03em] text-center cursor-pointer select-none"
          onClick={() => setFlipped(!flipped)}
        >
          {flipped ? '© Copyright is a fallacy' : original}
        </p>
      </Container>
    </footer>
  )
}
