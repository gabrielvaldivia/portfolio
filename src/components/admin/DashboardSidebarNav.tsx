import type { SanitizedPermissions, ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

import {
  DashboardSidebarNavClient,
  type DashboardSidebarIconKey,
  type DashboardSidebarNavItem,
} from './DashboardSidebarNavClient'

type CollectionNavItem = {
  icon: DashboardSidebarIconKey
  label: string
  slug: string
}

const contentCollections: CollectionNavItem[] = [
  { icon: 'projects', label: 'Projects', slug: 'projects' },
  { icon: 'sideProjects', label: 'Playground', slug: 'side-projects' },
  { icon: 'notes', label: 'Notes', slug: 'notes' },
  { icon: 'subscribers', label: 'Subscribers', slug: 'note-subscribers' },
  { icon: 'clients', label: 'Clients', slug: 'clients' },
  { icon: 'people', label: 'People', slug: 'people' },
  { icon: 'services', label: 'Services', slug: 'services' },
  { icon: 'conversations', label: 'Conversations', slug: 'conversations' },
  { icon: 'photos', label: 'Photos', slug: 'photos' },
  { icon: 'media', label: 'Media', slug: 'media' },
]

function canReadCollection(permissions: SanitizedPermissions | undefined, slug: string) {
  return Boolean(permissions?.collections?.[slug]?.read)
}

function canReadGlobal(permissions: SanitizedPermissions | undefined, slug: string) {
  return Boolean(permissions?.globals?.[slug]?.read)
}

function collectionItem(adminRoute: string, item: CollectionNavItem): DashboardSidebarNavItem {
  return {
    href: formatAdminURL({
      adminRoute,
      path: `/collections/${item.slug}`,
    }),
    icon: item.icon,
    id: `collection-${item.slug}`,
    label: item.label,
  }
}

export function DashboardSidebarNav({ payload, permissions }: ServerProps) {
  const adminRoute = payload.config.routes.admin

  const items: DashboardSidebarNavItem[] = [
    {
      href: formatAdminURL({
        adminRoute,
        path: '',
      }),
      icon: 'recent',
      id: 'recent',
      label: 'Recent',
      match: 'exact',
    },
  ]

  if (canReadCollection(permissions, 'pages')) {
    items.push({
      href: formatAdminURL({
        adminRoute,
        path: '/collections/pages',
      }),
      icon: 'pages',
      id: 'nav',
      label: 'Nav',
    })
  }

  if (canReadGlobal(permissions, 'timeline')) {
    items.push({
      href: formatAdminURL({
        adminRoute,
        path: '/globals/timeline',
      }),
      icon: 'timeline',
      id: 'timeline',
      label: 'Timeline',
    })
  }

  const collectionChildren = contentCollections
    .filter((item) => canReadCollection(permissions, item.slug))
    .map((item) => collectionItem(adminRoute, item))

  items.push(...collectionChildren)

  return <DashboardSidebarNavClient items={items} />
}
