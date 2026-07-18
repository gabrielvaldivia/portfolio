'use client'

import {
  BriefcaseBusinessIcon,
  BubbleChatIcon,
  Camera01Icon,
  CustomerService01Icon,
  DashboardSquare03Icon,
  File02Icon,
  Folder01Icon,
  IdentityCardIcon,
  Image03Icon,
  Layers01Icon,
  LayoutGridIcon,
  Setting06Icon,
  User03Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'
import { Link } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import type { IconSvgElement } from '@hugeicons/react'

import { AdminHugeIcon } from './Hugeicons'

export type DashboardSidebarIconKey =
  | 'admin'
  | 'clients'
  | 'collections'
  | 'conversations'
  | 'dashboard'
  | 'media'
  | 'page'
  | 'pages'
  | 'people'
  | 'photos'
  | 'projects'
  | 'services'
  | 'settings'
  | 'sideProjects'
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
  dashboard: DashboardSquare03Icon,
  media: Image03Icon,
  page: File02Icon,
  pages: Folder01Icon,
  people: UserMultiple02Icon,
  photos: Camera01Icon,
  projects: BriefcaseBusinessIcon,
  services: CustomerService01Icon,
  settings: Setting06Icon,
  sideProjects: Layers01Icon,
  users: User03Icon,
}

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

  return (
    <div className="custom-sidebar-nav" aria-label="CMS navigation">
      {items.map((item) => {
        const children = item.children ?? []
        const hasChildren = children.length > 0
        const parentCurrent = isHrefActive(pathname, item.href, item.match)
        const parentActive = parentCurrent && !hasChildren
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
            <details className="custom-sidebar-nav__group custom-sidebar-nav__group--collapsible" key={item.id} open>
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
  )
}
