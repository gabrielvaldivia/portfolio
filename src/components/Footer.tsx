'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useReducedMotion } from 'motion/react'
import { Container } from './Container'
import { SocialIcon } from './Icons'

const ALTERNATE_COPYRIGHT = '© Copyright is a fallacy'
const SCRAMBLE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#$%&'
const SCRAMBLE_DURATION = 600
const FOOTER_TEXT_LINK_CLASS =
  'font-mono text-sm uppercase tracking-[-0.03em] text-content opacity-50 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content'
const FOOTER_LINKS = [
  { label: 'Photo', href: '/photo' },
  { label: 'Activity', href: '/activity' },
  { label: 'Chat', href: '/chat' },
]

type FooterSocialLink = {
  platform: string
  url: string
}

export function Footer({
  copyright,
  email,
  socialLinks,
}: {
  copyright?: string
  email: string
  socialLinks: FooterSocialLink[]
}) {
  const pathname = usePathname()
  const year = new Date().getFullYear()
  const original = copyright || `© Copyright ${year}`
  const [flipped, setFlipped] = useState(false)
  const [displayedCopyright, setDisplayedCopyright] = useState(original)
  const displayedCopyrightRef = useRef(original)
  const flippedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const footerSocialLinks = [
    { platform: 'Email', url: `mailto:${email}` },
    ...socialLinks,
  ]

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const updateDisplayedCopyright = (value: string) => {
    displayedCopyrightRef.current = value
    setDisplayedCopyright(value)
  }

  const handleCopyrightClick = () => {
    const nextFlipped = !flippedRef.current
    const target = nextFlipped ? ALTERNATE_COPYRIGHT : original

    flippedRef.current = nextFlipped
    setFlipped(nextFlipped)

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (prefersReducedMotion) {
      updateDisplayedCopyright(target)
      return
    }

    const source = displayedCopyrightRef.current
    const characterCount = Math.max(source.length, target.length)
    const startedAt = performance.now()

    const scramble = (now: number) => {
      const progress = Math.min((now - startedAt) / SCRAMBLE_DURATION, 1)
      const resolvedCharacters = Math.floor(progress * characterCount)

      const nextText = Array.from({ length: characterCount }, (_, index) => {
        if (index < resolvedCharacters || progress === 1) {
          return target[index] ?? ' '
        }

        return SCRAMBLE_CHARACTERS[
          Math.floor(Math.random() * SCRAMBLE_CHARACTERS.length)
        ]
      }).join('')

      updateDisplayedCopyright(progress === 1 ? target : nextText)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(scramble)
      } else {
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(scramble)
  }

  if (pathname.startsWith('/chat')) return null

  return (
    <footer className="pt-5 pb-24 tablet:pb-20">
      <Container>
        <div className="flex flex-col items-center gap-5 tablet:grid tablet:grid-cols-3 tablet:items-center">
          <div className="tablet:justify-self-start">
            <button
              type="button"
              aria-pressed={flipped}
              className="block cursor-pointer select-none text-center tablet:text-left font-mono text-sm uppercase tracking-[-0.03em] text-content opacity-50 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
              onClick={handleCopyrightClick}
            >
              <span className="sr-only">
                {flipped ? ALTERNATE_COPYRIGHT : original}
              </span>
              <span aria-hidden="true" className="inline-grid">
                <span className="invisible col-start-1 row-start-1 whitespace-pre">
                  {original.length > ALTERNATE_COPYRIGHT.length ? original : ALTERNATE_COPYRIGHT}
                </span>
                <span className="col-start-1 row-start-1 whitespace-pre">
                  {displayedCopyright}
                </span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4 tablet:justify-self-center">
            {footerSocialLinks.map((link) => (
              <a
                key={`${link.platform}:${link.url}`}
                href={link.url}
                target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                rel={link.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                aria-label={link.platform}
                className="flex size-5 items-center justify-center text-content opacity-50 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
              >
                <span aria-hidden="true">
                  <SocialIcon platform={link.platform} />
                </span>
              </a>
            ))}
          </div>

          <nav
            aria-label="Footer"
            className="flex items-center gap-4 tablet:justify-self-end"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={FOOTER_TEXT_LINK_CLASS}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  )
}
