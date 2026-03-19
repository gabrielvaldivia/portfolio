'use client'

import { useState } from 'react'
import { Container } from './Container'

export function Footer({ copyright }: { copyright?: string }) {
  const year = new Date().getFullYear()
  const original = copyright || `© Copyright ${year}`
  const [flipped, setFlipped] = useState(false)

  return (
    <footer className="py-10 tablet:py-20">
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
