'use client'

import {
  BriefcaseBusinessIcon,
  BrowserIcon,
  BubbleChatIcon,
  Camera01Icon,
  Clock01Icon,
  CustomerService01Icon,
  File02Icon,
  IdentityCardIcon,
  Image03Icon,
  Layers01Icon,
  LayoutGridIcon,
  Mail01Icon,
  Menu02Icon,
  Setting06Icon,
  TimelineListIcon,
  User03Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'
import { Link, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import type { IconSvgElement } from '@hugeicons/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { AdminHugeIcon } from './Hugeicons'

export type DashboardSidebarIconKey =
  | 'admin'
  | 'clients'
  | 'collections'
  | 'conversations'
  | 'media'
  | 'notes'
  | 'page'
  | 'pages'
  | 'people'
  | 'photos'
  | 'projects'
  | 'recent'
  | 'services'
  | 'settings'
  | 'sideProjects'
  | 'subscribers'
  | 'timeline'
  | 'users'

export type DashboardSidebarNavItem = {
  children?: DashboardSidebarNavItem[]
  href?: string
  icon: DashboardSidebarIconKey
  id: string
  label: string
  match?: 'exact' | 'section'
}

type DashboardSidebarNavClientProps = {
  items: DashboardSidebarNavItem[]
}

const icons: Record<DashboardSidebarIconKey, IconSvgElement> = {
  admin: Setting06Icon,
  clients: IdentityCardIcon,
  collections: LayoutGridIcon,
  conversations: BubbleChatIcon,
  media: Image03Icon,
  notes: File02Icon,
  page: BrowserIcon,
  pages: Menu02Icon,
  people: UserMultiple02Icon,
  photos: Camera01Icon,
  projects: BriefcaseBusinessIcon,
  recent: Clock01Icon,
  services: CustomerService01Icon,
  settings: Setting06Icon,
  sideProjects: Layers01Icon,
  subscribers: Mail01Icon,
  timeline: TimelineListIcon,
  users: User03Icon,
}

const mobileNavMediaQuery = '(max-width: 768px)'
const swipeCloseDistance = 72
const swipeDirectionRatio = 1.2
const swipeIntentDistance = 8

function isHrefActive(pathname: string, href?: string, match: DashboardSidebarNavItem['match'] = 'section') {
  if (!href) return false
  const normalizedHref = href.endsWith('/') && href !== '/' ? href.slice(0, -1) : href
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname

  if (match === 'exact') {
    return normalizedPathname === normalizedHref
  }

  return (
    normalizedPathname === normalizedHref ||
    (normalizedPathname.startsWith(normalizedHref) && normalizedPathname[normalizedHref.length] === '/')
  )
}

function isItemActive(pathname: string, item: DashboardSidebarNavItem): boolean {
  return (
    isHrefActive(pathname, item.href, item.match) ||
    item.children?.some((child) => isItemActive(pathname, child)) ||
    false
  )
}

function SidebarRow({
  active,
  current,
  hasChildren,
  item,
  level,
}: {
  active: boolean
  current?: boolean
  hasChildren?: boolean
  item: DashboardSidebarNavItem
  level: 'child' | 'parent'
}) {
  const content = (
    <>
      <span className="custom-sidebar-nav__icon" aria-hidden="true">
        <AdminHugeIcon icon={icons[item.icon]} />
      </span>
      <span className="custom-sidebar-nav__label">{item.label}</span>
      {hasChildren ? <span className="custom-sidebar-nav__chevron" aria-hidden="true" /> : null}
    </>
  )
  const className = [
    'custom-sidebar-nav__item',
    `custom-sidebar-nav__item--${level}`,
    hasChildren && 'custom-sidebar-nav__item--with-children',
    active && 'custom-sidebar-nav__item--active',
  ]
    .filter(Boolean)
    .join(' ')

  if (hasChildren) {
    return <summary className={className}>{content}</summary>
  }

  if (!item.href) {
    return <div className={className}>{content}</div>
  }

  return (
    <Link aria-current={current ? 'page' : undefined} className={className} href={item.href} prefetch={false}>
      {content}
    </Link>
  )
}

export function DashboardSidebarNavClient({ items }: DashboardSidebarNavClientProps) {
  const pathname = usePathname()
  const { navOpen, navRef, setNavOpen } = useNav()
  const [overlayRoot, setOverlayRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setOverlayRoot(document.body)
  }, [])

  useEffect(() => {
    if (!navOpen || !window.matchMedia(mobileNavMediaQuery).matches) return

    const scrollContainer = navRef.current
    if (scrollContainer) scrollContainer.scrollTop = 0
  }, [navOpen, navRef])

  useEffect(() => {
    const scrollContainer = navRef.current
    const navElement = scrollContainer?.closest<HTMLElement>('.nav')
    if (!scrollContainer || !navElement) return

    let activePointerId: number | null = null
    let gestureAxis: 'horizontal' | 'vertical' | null = null
    let startX = 0
    let startY = 0

    const resetGesture = () => {
      activePointerId = null
      gestureAxis = null
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== 'touch' ||
        !window.matchMedia(mobileNavMediaQuery).matches ||
        !navElement.classList.contains('nav--nav-open')
      ) {
        return
      }

      activePointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      gestureAxis = null
      scrollContainer.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return

      const distanceX = event.clientX - startX
      const distanceY = event.clientY - startY

      if (
        !gestureAxis &&
        Math.max(Math.abs(distanceX), Math.abs(distanceY)) >= swipeIntentDistance
      ) {
        gestureAxis = Math.abs(distanceX) > Math.abs(distanceY) ? 'horizontal' : 'vertical'
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return

      const distanceX = event.clientX - startX
      const distanceY = event.clientY - startY
      const isRightwardSwipe =
        gestureAxis === 'horizontal' &&
        distanceX >= swipeCloseDistance &&
        distanceX > Math.abs(distanceY) * swipeDirectionRatio

      if (isRightwardSwipe) setNavOpen(false)
      resetGesture()
    }

    scrollContainer.addEventListener('pointerdown', handlePointerDown)
    scrollContainer.addEventListener('pointermove', handlePointerMove)
    scrollContainer.addEventListener('pointerup', handlePointerUp)
    scrollContainer.addEventListener('pointercancel', resetGesture)

    return () => {
      scrollContainer.removeEventListener('pointerdown', handlePointerDown)
      scrollContainer.removeEventListener('pointermove', handlePointerMove)
      scrollContainer.removeEventListener('pointerup', handlePointerUp)
      scrollContainer.removeEventListener('pointercancel', resetGesture)
    }
  }, [navRef, setNavOpen])

  return (
    <>
      {overlayRoot && navOpen
        ? createPortal(
            <button
              aria-label="Close admin navigation"
              className="admin-sidebar-scrim"
              onClick={() => setNavOpen(false)}
              type="button"
            />,
            overlayRoot,
          )
        : null}
      <div className="custom-sidebar-nav" aria-label="CMS navigation">
        <h2 className="custom-sidebar-nav__title">Admin</h2>
        {items.map((item) => {
          const children = item.children ?? []
          const hasChildren = children.length > 0
          const parentCurrent = isHrefActive(pathname, item.href, item.match)
          const parentActive = isItemActive(pathname, item) && !hasChildren
          const groupContent = (
            <>
              <SidebarRow
                active={parentActive}
                current={parentCurrent}
                hasChildren={hasChildren}
                item={item}
                level="parent"
              />
              {hasChildren ? (
                <div className="custom-sidebar-nav__children" id={`custom-sidebar-nav-children-${item.id}`}>
                  {children.map((child) => {
                    const childCurrent = isHrefActive(pathname, child.href, child.match)

                    return (
                      <SidebarRow
                        active={isItemActive(pathname, child)}
                        current={childCurrent}
                        item={child}
                        key={child.id}
                        level="child"
                      />
                    )
                  })}
                </div>
              ) : null}
            </>
          )

          if (hasChildren) {
            return (
              <details
                className="custom-sidebar-nav__group custom-sidebar-nav__group--collapsible"
                key={item.id}
                open
              >
                {groupContent}
              </details>
            )
          }

          return (
            <section className="custom-sidebar-nav__group" key={item.id}>
              {groupContent}
            </section>
          )
        })}
      </div>
    </>
  )
}
