'use client'

import { Logout03Icon, Setting06Icon, User03Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { Link } from '@payloadcms/ui'
import { useEffect, useId, useRef, useState } from 'react'

import { AdminHugeIcon } from './Hugeicons'

type SidebarAccountMenuIcon = 'account' | 'logout' | 'settings' | 'users'

export type SidebarAccountMenuItem = {
  href: string
  icon: SidebarAccountMenuIcon
  id: string
  label: string
}

type SidebarAccountClientProps = {
  accountLabel: string
  email?: string
  items: SidebarAccountMenuItem[]
}

const icons: Record<SidebarAccountMenuIcon, IconSvgElement> = {
  account: UserCircleIcon,
  logout: Logout03Icon,
  settings: Setting06Icon,
  users: User03Icon,
}

export function SidebarAccountClient({ accountLabel, email, items }: SidebarAccountClientProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="custom-sidebar-account-menu" ref={rootRef}>
      {open ? (
        <div className="custom-sidebar-account-menu__popover" id={menuId} role="menu">
          {items.map((item) => (
            <Link
              className="custom-sidebar-account-menu__item"
              href={item.href}
              key={item.id}
              onClick={() => setOpen(false)}
              prefetch={false}
              role="menuitem"
            >
              <span className="custom-sidebar-account-menu__icon" aria-hidden="true">
                <AdminHugeIcon icon={icons[item.icon]} />
              </span>
              <span className="custom-sidebar-account-menu__label">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={email ? `${accountLabel}: ${email}` : accountLabel}
        className="custom-sidebar-account"
        onClick={() => setOpen((isOpen) => !isOpen)}
        type="button"
      >
        <span className="custom-sidebar-account__icon" aria-hidden="true">
          <AdminHugeIcon icon={UserCircleIcon} />
        </span>
        <span className="custom-sidebar-account__text">
          <span className="custom-sidebar-account__email">{email || accountLabel}</span>
        </span>
      </button>
    </div>
  )
}
