'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type NavItem = { label: string; url: string; newTab?: boolean }

function NavPill({ item, active, onClick }: { item: NavItem; active: boolean; onClick: (e: React.MouseEvent, url: string) => void }) {
  return (
    <Link
      href={item.url}
      target={item.newTab ? '_blank' : undefined}
      onClick={(e) => onClick(e, item.url)}
      className={`transition-colors rounded-full px-5 py-2.5 backdrop-blur-[40px] ${active ? 'bg-content' : 'bg-floating hover:bg-hover'}`}
      style={{ color: active ? 'var(--color-nav-active-text)' : undefined }}
    >
      {item.label}
    </Link>
  )
}

function CloseButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="bg-floating hover:bg-hover transition-colors rounded-full w-10 h-10 flex items-center justify-center"
      aria-label="Close"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}

export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState('')

  const isProjectPage = (pathname?.startsWith('/work/') && pathname !== '/work') || pathname === '/about' || pathname === '/clients' || pathname === '/playground'
  const isDesignSystem = pathname === '/design-system'

  useEffect(() => {
    if (pathname !== '/') {
      setActiveHash('')
      return
    }

    const sections = items
      .filter((item) => item.url.startsWith('/#'))
      .map((item) => ({
        id: item.url.replace('/#', ''),
        url: item.url,
      }))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          )
          const matchedItem = sections.find((s) => s.id === top.target.id)
          if (matchedItem) setActiveHash(matchedItem.url)
        }
      },
      { threshold: 0.3 }
    )

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [pathname, items])

  const isActive = (url: string) => {
    if (url.startsWith('/#')) return activeHash === url
    if (url === '/work') return pathname === '/work' || pathname?.startsWith('/work/')
    return pathname === url
  }

  const handleClick = (e: React.MouseEvent, url: string) => {
    if (url.startsWith('/#')) {
      e.preventDefault()
      const id = url.replace('/#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        setActiveHash(url)
      } else if (pathname !== '/') {
        window.location.href = url
      }
    }
  }

  if (isDesignSystem) return null

  if (isProjectPage) {
    return (
      <>
        <nav className="fixed top-0 right-0 z-50 p-5 tablet:p-10">
          <CloseButton />
        </nav>
      </>
    )
  }

  return (
    <>
      {/* Desktop nav — top right */}
      <nav className="fixed top-0 right-0 z-50 hidden tablet:flex items-center gap-2.5 p-10">
        {items.map((item) => (
          <NavPill key={item.url} item={item} active={isActive(item.url)} onClick={handleClick} />
        ))}
      </nav>

      {/* Mobile nav — bottom fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 tablet:hidden flex items-center justify-center gap-2 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {items.map((item) => (
          <NavPill key={item.url} item={item} active={isActive(item.url)} onClick={handleClick} />
        ))}
      </nav>
    </>
  )
}
