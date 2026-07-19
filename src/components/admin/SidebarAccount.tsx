import type { SanitizedPermissions, ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

import { SidebarAccountClient, type SidebarAccountMenuItem } from './SidebarAccountClient'

function canReadCollection(permissions: SanitizedPermissions | undefined, slug: string) {
  return Boolean(permissions?.collections?.[slug]?.read)
}

function canReadGlobal(permissions: SanitizedPermissions | undefined, slug: string) {
  return Boolean(permissions?.globals?.[slug]?.read)
}

export function SidebarAccount({ payload, permissions, user }: ServerProps) {
  const adminRoute = payload.config.routes.admin
  const accountRoute = payload.config.admin.routes?.account || '/account'
  const logoutRoute = payload.config.admin.routes?.logout || '/logout'

  const items: SidebarAccountMenuItem[] = [
    ...(canReadGlobal(permissions, 'site-settings')
      ? [
          {
            href: formatAdminURL({
              adminRoute,
              path: '/globals/site-settings',
            }),
            icon: 'settings' as const,
            id: 'site-settings',
            label: 'Site settings',
          },
        ]
      : []),
    ...(canReadCollection(permissions, 'users')
      ? [
          {
            href: formatAdminURL({
              adminRoute,
              path: '/collections/users',
            }),
            icon: 'users' as const,
            id: 'users',
            label: 'Users',
          },
        ]
      : []),
    {
      href: formatAdminURL({
        adminRoute,
        path: accountRoute,
      }),
      icon: 'account',
      id: 'account',
      label: 'Account',
    },
    {
      href: formatAdminURL({
        adminRoute,
        path: logoutRoute,
      }),
      icon: 'logout',
      id: 'sign-out',
      label: 'Sign out',
    },
  ]

  return <SidebarAccountClient accountLabel="Account" email={user?.email} items={items} />
}
