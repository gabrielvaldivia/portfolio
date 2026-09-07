'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { cn } from '@/lib/cn'

type NavMenuPage = {
  label: string
  url: string
}

const fallbackPages: NavMenuPage[] = [
  { label: 'Home', url: '/' },
  { label: 'About', url: '/about' },
  { label: 'Work', url: '/work' },
  { label: 'Playground', url: '/playground' },
  { label: 'Notes', url: '/notes' },
  { label: 'Clients', url: '/clients' },
  { label: 'People', url: '/people' },
]

const expandedDesktopPagePool = [
  { label: 'Home', url: '/' },
  { label: 'About', url: '/about' },
  { label: 'Work', url: '/work' },
  { label: 'Play', url: '/playground' },
] as const

const expandedDesktopCollapseOffsets = [196, 124, 60] as const

const desktopNavCollapseThreshold = 64
const desktopNavExpandThreshold = 16

function orderNavigationPages(pages: NavMenuPage[]) {
  const notesPage = pages.find((page) => page.url === '/notes') ?? {
    label: 'Notes',
    url: '/notes',
  }
  const orderedPages = pages
    .filter((page) => page.url !== '/notes')

  const playgroundIndex = orderedPages.findIndex((page) => page.url === '/playground')
  orderedPages.splice(playgroundIndex >= 0 ? playgroundIndex + 1 : orderedPages.length, 0, notesPage)

  return orderedPages
}

export function NavMenu({ pages }: { pages?: NavMenuPage[] }) {
  const [open, setOpen] = useState(false)
  const [expandedNavHidden, setExpandedNavHidden] = useState(false)
  const pathname = usePathname()
  const isChat = pathname.startsWith('/chat')
  const navPages = orderNavigationPages(pages?.length ? pages : fallbackPages)
  const currentShortcutUrl = pathname === '/'
    ? '/'
    : expandedDesktopPagePool.find((page) => page.url !== '/' && pathname.startsWith(page.url))?.url
  const desktopPages = expandedDesktopPagePool
    .filter((page) => page.url !== currentShortcutUrl)
    .slice(0, 3)
    .map((page, index) => ({
      ...page,
      collapseOffset: expandedDesktopCollapseOffsets[index],
    }))
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const expandedControlsHidden = expandedNavHidden || open
  const collapsedMenuButtonVisible = expandedNavHidden || open
  const navTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' as const }

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setExpandedNavHidden((currentlyHidden) => (
      currentlyHidden
        ? latest > desktopNavExpandThreshold
        : latest >= desktopNavCollapseThreshold
    ))
  })

  return (
    <>
      {/* Desktop — top right */}
      <nav
        className="fixed top-0 right-0 z-50 hidden tablet:block p-10"
        style={isChat ? { transform: 'translateY(var(--chat-viewport-top, 0px))' } : undefined}
      >
        <div className={cn('relative flex items-center justify-end', isChat && 'chat-nav-content')}>
          <div
            aria-hidden={expandedControlsHidden}
            inert={expandedControlsHidden ? true : undefined}
            className={cn(
              'absolute right-16 top-0 flex h-10 items-center gap-6 whitespace-nowrap',
              expandedControlsHidden && 'pointer-events-none',
            )}
          >
            {desktopPages.map((page) => (
              <motion.div
                key={page.collapseOffset}
                animate={{
                  opacity: expandedControlsHidden ? 0 : 1,
                  scale: expandedControlsHidden ? 0.82 : 1,
                  x: expandedControlsHidden ? page.collapseOffset : 0,
                }}
                transition={navTransition}
                className="origin-right"
              >
                <Link
                  href={page.url}
                  prefetch
                  aria-current={pathname === page.url || pathname.startsWith(`${page.url}/`) ? 'page' : undefined}
                  className="rounded-sm text-body text-text-muted transition-colors duration-150 hover:text-text-strong focus-visible:text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
                >
                  {page.label}
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={false}
            aria-hidden={expandedControlsHidden}
            tabIndex={expandedControlsHidden ? -1 : 0}
            animate={{
              opacity: expandedControlsHidden ? 0 : 1,
              scale: expandedControlsHidden ? 0.82 : 1,
            }}
            transition={navTransition}
            className={cn(
              'group absolute right-0 top-0 flex h-10 items-center rounded-sm text-body text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content',
              expandedControlsHidden && 'pointer-events-none',
            )}
          >
            <span className="text-text-muted transition-colors duration-150 group-hover:text-text-strong group-focus-visible:text-text-strong">
              More
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-hidden={!collapsedMenuButtonVisible}
            tabIndex={collapsedMenuButtonVisible ? 0 : -1}
            // Emit the hidden state in server HTML instead of fading out on mount.
            initial={false}
            animate={{
              opacity: collapsedMenuButtonVisible ? 1 : 0,
              scale: collapsedMenuButtonVisible ? 1 : 0.82,
            }}
            transition={navTransition}
            className={cn(`flex size-10 items-center justify-center rounded-full backdrop-blur-[40px] transition-colors cursor-pointer ${
              open ? 'bg-content' : 'bg-floating hover:bg-hover'
            }`, !collapsedMenuButtonVisible && 'pointer-events-none')}
            style={open ? { color: 'var(--color-nav-active-text)' } : undefined}
          >
            <div className="w-4 h-3 relative flex flex-col justify-center items-center">
              <span
                className={`block h-[1.5px] w-4 bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'rotate-45 top-[5px]' : 'top-[2px]'
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'w-4 -rotate-45 top-[5px]' : 'w-2.5 top-[9px]'
                }`}
              />
            </div>
          </motion.button>

          {/* Popover */}
          <div
            className={`absolute top-full right-0 mt-2 bg-floating backdrop-blur-[40px] rounded-[20px] py-2 px-4 min-w-[200px] flex flex-col transition-all duration-300 ease-out origin-top-right ${
              open
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {navPages.map((page) => {
              const isActive = pathname === page.url || (page.url !== '/' && pathname?.startsWith(page.url))
              return (
                <Link
                  key={page.url}
                  href={page.url}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 py-1.5 transition-all text-body ${
                    isActive
                      ? 'text-text-strong opacity-100'
                      : 'text-text-subtle hover:text-text-strong'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-current' : 'bg-transparent'}`} />
                  {page.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile — top right */}
      <nav
        className="mobile-site-nav fixed top-0 right-0 z-[61] tablet:hidden p-4"
        style={isChat ? { transform: 'translateY(var(--chat-viewport-top, 0px))' } : undefined}
      >
        <div className={cn('relative', isChat && 'chat-nav-content')}>
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-[40px] transition-colors cursor-pointer ${
              open ? 'bg-content' : 'bg-floating hover:bg-hover'
            }`}
            style={open ? { color: 'var(--color-nav-active-text)' } : undefined}
          >
            <div className="w-4 h-3 relative flex flex-col justify-center items-center">
              <span
                className={`block h-[1.5px] w-4 bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'rotate-45 top-[5px]' : 'top-[2px]'
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ease-out absolute ${
                  open ? 'w-4 -rotate-45 top-[5px]' : 'w-2.5 top-[9px]'
                }`}
              />
            </div>
          </button>

          {/* Popover — opens downward on mobile */}
          <div
            className={`absolute top-full right-0 mt-2 bg-floating backdrop-blur-[40px] rounded-[20px] py-2 px-4 min-w-[200px] flex flex-col transition-all duration-300 ease-out origin-top-right ${
              open
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {navPages.map((page) => {
              const isActive = pathname === page.url || (page.url !== '/' && pathname?.startsWith(page.url))
              return (
                <Link
                  key={page.url}
                  href={page.url}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 py-1.5 transition-all text-body ${
                    isActive
                      ? 'text-text-strong opacity-100'
                      : 'text-text-subtle hover:text-text-strong'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-current' : 'bg-transparent'}`} />
                  {page.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
