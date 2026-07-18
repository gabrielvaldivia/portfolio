'use client'

import { Link, useAuth, useConfig, useTranslation } from '@payloadcms/ui'
import { UserCircleIcon } from '@hugeicons/core-free-icons'
import { formatAdminURL } from 'payload/shared'
import { AdminHugeIcon } from './Hugeicons'

export function SidebarAccount() {
  const {
    config: {
      admin: {
        routes: { account: accountRoute },
      },
      routes: { admin: adminRoute },
    },
  } = useConfig()
  const { t } = useTranslation()
  const { user } = useAuth()
  const accountLabel = t('authentication:account')

  return (
    <Link
      aria-label={user?.email ? `${accountLabel}: ${user.email}` : accountLabel}
      className="custom-sidebar-account"
      href={formatAdminURL({
        adminRoute,
        path: accountRoute,
      })}
      prefetch={false}
    >
      <span className="custom-sidebar-account__icon" aria-hidden="true">
        <AdminHugeIcon icon={UserCircleIcon} />
      </span>
      {user?.email && (
        <span className="custom-sidebar-account__text">
          <span className="custom-sidebar-account__email">{user.email}</span>
        </span>
      )}
    </Link>
  )
}
