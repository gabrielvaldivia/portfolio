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
const closedMenuSurface = 'bg-neutral-300/45 peer-hover:bg-neutral-300/60 dark:bg-neutral-700/45 dark:peer-hover:bg-neutral-700/60'
const openMenuSurface = 'bg-floating'
// The panel is always rendered at full size; clip-path shrinks it to the
// 40px circle the toggle sits on, so the button itself grows into the menu.
const closedMenuClip = 'inset(0 0 calc(100% - 40px) calc(100% - 40px) round 20px)'
const openMenuClip = 'inset(0 0 0 0 round 20px)'

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

          <MorphMenu
            open={open}
            setOpen={setOpen}
            pages={navPages}
            pathname={pathname}
            onNavigate={handleMenuNavigate}
            visible={collapsedMenuButtonVisible}
          />
        </div>
      </nav>

      {/* Mobile — top right */}
      <nav
        className="mobile-site-nav fixed top-0 right-0 z-[61] tablet:hidden p-4"
        style={isChat ? { transform: 'translateY(var(--chat-viewport-top, 0px))' } : undefined}
      >
        <div className={cn('relative', isChat && 'chat-nav-content')}>
          <MorphMenu
            open={open}
            setOpen={setOpen}
            pages={navPages}
            pathname={pathname}
            onNavigate={handleMenuNavigate}
          />
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

function MorphMenu({
  open,
  setOpen,
  pages,
  pathname,
  onNavigate,
  visible = true,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  pages: NavMenuPage[]
  pathname: string
  onNavigate: (event: { preventDefault: () => void }, url: string) => void
  visible?: boolean
}) {
  return (
    <div
      aria-hidden={!visible}
      style={{
        opacity: visible ? 1 : 0,
        transform: `scale(${visible ? 1 : 0.82})`,
      }}
      className={cn(
        'relative size-10 origin-top-right transition-[opacity,transform] duration-200 ease-out motion-reduce:duration-0',
        !visible && 'pointer-events-none',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        tabIndex={visible ? 0 : -1}
        className={cn(
          'site-menu-toggle group peer absolute right-0 top-0 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content',
          'text-text-strong',
        )}
      >
                <div
          className={cn(
            'w-4 h-3 relative flex flex-col justify-center items-center transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:duration-0',
            // Open: nudge the X so its top and right insets match and it centers on
            // the first item's lowercase letters. Fade the whole icon (not each line) so the crossing
            // stays even, landing on the same tone as deselected items (40%).
            open && '-translate-x-[4.5px] translate-y-[4.75px] opacity-40 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
        >
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

      <div
        aria-hidden={!open}
        inert={open ? undefined : true}
        style={{ clipPath: open ? openMenuClip : closedMenuClip }}
        className={cn(
          'absolute right-0 top-0 flex min-w-[200px] flex-col rounded-[20px] pt-[4px] pb-2 pl-4 pr-12 backdrop-blur-[40px] transition-[clip-path,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:duration-0',
          open ? openMenuSurface : closedMenuSurface,
        )}
      >
        {pages.map((page) => {
          const isActive = isNavPageActive(pathname, page.url)
          return (
            <Link
              key={page.url}
              href={page.url}
              prefetch={true}
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
              onNavigate={(event) => onNavigate(event, page.url)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap py-1.5 text-body transition-[color,opacity] duration-200',
                open ? 'opacity-100 delay-75' : 'opacity-0',
                isActive ? 'text-text-strong' : 'text-text-subtle hover:text-text-strong',
              )}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-current' : 'bg-transparent'}`} />
              {page.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
