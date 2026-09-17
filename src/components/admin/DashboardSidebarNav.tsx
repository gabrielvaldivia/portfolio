import type { SanitizedPermissions, ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

import {
  DashboardSidebarNavClient,
  type DashboardSidebarIconKey,
  type DashboardSidebarNavItem,
  type DashboardSidebarNavSection,
} from './DashboardSidebarNavClient'

type CollectionNavItem = {
  icon: DashboardSidebarIconKey
  label: string
  slug: string
}

const siteCollections: CollectionNavItem[] = [
  { icon: 'projects', label: 'Projects', slug: 'projects' },
  { icon: 'sideProjects', label: 'Playground', slug: 'side-projects' },
  { icon: 'notes', label: 'Notes', slug: 'notes' },
  { icon: 'photos', label: 'Photos', slug: 'photos' },
]

const operationsCollections: CollectionNavItem[] = [
  { icon: 'clients', label: 'Clients', slug: 'clients' },
  { icon: 'services', label: 'Services', slug: 'services' },
  { icon: 'people', label: 'People', slug: 'people' },
  { icon: 'subscribers', label: 'Subscribers', slug: 'note-subscribers' },
  { icon: 'conversations', label: 'Conversations', slug: 'conversations' },
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

  const recentItems: DashboardSidebarNavItem[] = [
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

  const siteItems: DashboardSidebarNavItem[] = []

  if (canReadCollection(permissions, 'pages')) {
    siteItems.push({
      href: formatAdminURL({
        adminRoute,
        path: '/collections/pages',
      }),
      icon: 'pages',
      id: 'nav',
      label: 'Navigation',
    })
  }

  if (canReadGlobal(permissions, 'timeline')) {
    siteItems.push({
      href: formatAdminURL({
        adminRoute,
        path: '/globals/timeline',
      }),
      icon: 'timeline',
      id: 'timeline',
      label: 'Timeline',
    })
  }

  const readableItems = (collections: CollectionNavItem[]) =>
    collections
      .filter((item) => canReadCollection(permissions, item.slug))
      .map((item) => collectionItem(adminRoute, item))

  siteItems.push(...readableItems(siteCollections))

  const sections: DashboardSidebarNavSection[] = [
    { id: 'recent', items: recentItems },
    { id: 'site', label: 'Site', items: siteItems },
    { id: 'operations', label: 'Operations', items: readableItems(operationsCollections) },
  ]

  return <DashboardSidebarNavClient sections={sections.filter((section) => section.items.length > 0)} />
}
