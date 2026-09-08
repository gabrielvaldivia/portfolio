'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { orderSiteNavigationItems } from '@/lib/siteNavigation'

type NavMenuPage = {
  label: string
  url: string
}

const fallbackPages: NavMenuPage[] = [
  { label: 'Home', url: '/' },
  { label: 'About', url: '/about' },
  { label: 'Work', url: '/work' },
  { label: 'Notes', url: '/notes' },
  { label: 'Photos', url: '/photos' },
  { label: 'Clients', url: '/clients' },
  { label: 'People', url: '/people' },
]

const expandedDesktopPagePool = [
  { label: 'Home', url: '/' },
  { label: 'About', url: '/about' },
  { label: 'Work', url: '/work' },
  { label: 'Notes', url: '/notes' },
] as const

const expandedDesktopCollapseOffsets = [196, 124, 60] as const

const desktopNavCollapseThreshold = 64
const desktopNavExpandThreshold = 16

const subscribeToHydration = () => () => {}
const getHydratedSnapshot = () => true
const getServerHydratedSnapshot = () => false

function isNavPageActive(pathname: string, url: string) {
  return pathname === url
    || (url !== '/' && pathname.startsWith(`${url}/`))
}

export function NavMenu({ pages }: { pages?: NavMenuPage[] }) {
  const [open, setOpen] = useState(false)
  const [expandedNavHidden, setExpandedNavHidden] = useState(false)
  const pathname = usePathname()
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerHydratedSnapshot)
  // A cached shared layout can be prerendered under a different route. Keep
  // shortcut text identical in server HTML and the first hydration render,
  // then use the actual browser route without rebuilding the whole page.
  const shortcutPathname = hydrated ? pathname : '/'
  const isChat = pathname.startsWith('/chat')
  const navPages = orderSiteNavigationItems(pages?.length ? pages : fallbackPages)
  const currentShortcutUrl = shortcutPathname === '/'
    ? '/'
    : expandedDesktopPagePool.find((page) => isNavPageActive(shortcutPathname, page.url))?.url
  const desktopPages = expandedDesktopPagePool
    .filter((page) => page.url !== currentShortcutUrl)
    .slice(0, 3)
    .map((page, index) => ({
      ...page,
      collapseOffset: expandedDesktopCollapseOffsets[index],
    }))
  const expandedControlsHidden = expandedNavHidden || open
  const collapsedMenuButtonVisible = expandedNavHidden || open

  const handleMenuNavigate = (event: { preventDefault: () => void }, url: string) => {
    if (url !== '/' || pathname !== '/') return

    event.preventDefault()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  useEffect(() => {
    let animationFrame: number | null = null

    const updateExpandedNav = () => {
      animationFrame = null
      const latest = window.scrollY
      setExpandedNavHidden((currentlyHidden) => (
        currentlyHidden
          ? latest > desktopNavExpandThreshold
          : latest >= desktopNavCollapseThreshold
      ))
    }

    const handleScroll = () => {
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(updateExpandedNav)
      }
    }

    updateExpandedNav()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
    }
  }, [])

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
              <div
                key={page.collapseOffset}
                style={{
                  opacity: expandedControlsHidden ? 0 : 1,
                  transform: expandedControlsHidden
                    ? `translateX(${page.collapseOffset}px) scale(0.82)`
                    : 'translateX(0) scale(1)',
                }}
                className="origin-right transition-[opacity,transform] duration-200 ease-out motion-reduce:duration-0"
              >
                <Link
                  href={page.url}
                  prefetch
                  aria-current={isNavPageActive(pathname, page.url) ? 'page' : undefined}
                  className="rounded-sm text-body text-text-muted transition-colors duration-150 hover:text-text-strong focus-visible:text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
                >
                  {page.label}
                </Link>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={false}
            aria-hidden={expandedControlsHidden}
            tabIndex={expandedControlsHidden ? -1 : 0}
            style={{
              opacity: expandedControlsHidden ? 0 : 1,
              transform: `scale(${expandedControlsHidden ? 0.82 : 1})`,
            }}
            className={cn(
              'group absolute right-0 top-0 flex h-10 origin-right items-center rounded-sm text-body text-text-strong transition-[opacity,transform] duration-200 ease-out motion-reduce:duration-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content',
              expandedControlsHidden && 'pointer-events-none',
            )}
          >
            <span className="text-text-muted transition-colors duration-150 group-hover:text-text-strong group-focus-visible:text-text-strong">
              More
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-hidden={!collapsedMenuButtonVisible}
            tabIndex={collapsedMenuButtonVisible ? 0 : -1}
            style={{
              ...(open ? { color: 'var(--color-nav-active-text)' } : {}),
              opacity: collapsedMenuButtonVisible ? 1 : 0,
              transform: `scale(${collapsedMenuButtonVisible ? 1 : 0.82})`,
            }}
            className={cn(`flex size-10 items-center justify-center rounded-full backdrop-blur-[40px] transition-colors cursor-pointer ${
              open ? 'bg-content' : 'bg-floating hover:bg-hover'
            }`, 'origin-center transition-[background-color,color,opacity,transform] duration-200 ease-out motion-reduce:duration-0', !collapsedMenuButtonVisible && 'pointer-events-none')}
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

          {/* Popover */}
          <div
            aria-hidden={!open}
            inert={open ? undefined : true}
            className={`absolute top-full right-0 mt-2 bg-floating backdrop-blur-[40px] rounded-[20px] py-2 px-4 min-w-[200px] flex flex-col transition-all duration-300 ease-out origin-top-right ${
              open
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {navPages.map((page) => {
              const isActive = isNavPageActive(pathname, page.url)
              return (
                <Link
                  key={page.url}
                  href={page.url}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  onNavigate={(event) => handleMenuNavigate(event, page.url)}
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
            aria-hidden={!open}
            inert={open ? undefined : true}
            className={`absolute top-full right-0 mt-2 bg-floating backdrop-blur-[40px] rounded-[20px] py-2 px-4 min-w-[200px] flex flex-col transition-all duration-300 ease-out origin-top-right ${
              open
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {navPages.map((page) => {
              const isActive = isNavPageActive(pathname, page.url)
              return (
                <Link
                  key={page.url}
                  href={page.url}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  onNavigate={(event) => handleMenuNavigate(event, page.url)}
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
