import type { SanitizedPermissions, ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

import {
  DashboardSidebarNavClient,
  type DashboardSidebarIconKey,
  type DashboardSidebarNavItem,
} from './DashboardSidebarNavClient'

type DashboardPage = {
  id: number | string
  slug?: string | null
  title?: string | null
}

type CollectionNavItem = {
  icon: DashboardSidebarIconKey
  label: string
  slug: string
}

const contentCollections: CollectionNavItem[] = [
  { icon: 'projects', label: 'Projects', slug: 'projects' },
  { icon: 'sideProjects', label: 'Playground', slug: 'side-projects' },
  { icon: 'clients', label: 'Clients', slug: 'clients' },
  { icon: 'people', label: 'People', slug: 'people' },
  { icon: 'services', label: 'Services', slug: 'services' },
  { icon: 'conversations', label: 'Conversations', slug: 'conversations' },
  { icon: 'photos', label: 'Photos', slug: 'photos' },
]

const adminCollections: CollectionNavItem[] = [
  { icon: 'media', label: 'Media', slug: 'media' },
  { icon: 'users', label: 'Users', slug: 'users' },
]

function canReadCollection(permissions: SanitizedPermissions | undefined, slug: string) {
  return Boolean(permissions?.collections?.[slug]?.read)
}

function canCreateCollection(permissions: SanitizedPermissions | undefined, slug: string) {
  return Boolean(permissions?.collections?.[slug]?.create)
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

async function getPages({ payload, permissions }: Pick<ServerProps, 'payload' | 'permissions'>) {
  if (!canReadCollection(permissions, 'pages')) {
    return []
  }

  try {
    const { docs } = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      select: {
        slug: true,
        title: true,
      },
      sort: 'order',
    })

    return docs as DashboardPage[]
  } catch {
    return []
  }
}

export async function DashboardSidebarNav({ payload, permissions }: ServerProps) {
  const adminRoute = payload.config.routes.admin
  const pages = await getPages({ payload, permissions })

  const items: DashboardSidebarNavItem[] = [
    {
      href: formatAdminURL({
        adminRoute,
        path: '',
      }),
      icon: 'dashboard',
      id: 'dashboard',
      label: 'Dashboard',
      match: 'exact',
    },
  ]

  if (canReadCollection(permissions, 'pages')) {
    const pageChildren: DashboardSidebarNavItem[] = pages.map((page) => ({
      href: formatAdminURL({
        adminRoute,
        path: `/collections/pages/${page.id}`,
      }),
      icon: 'page',
      id: `page-${page.id}`,
      label: page.title || page.slug || 'Untitled page',
    }))

    if (pageChildren.length === 0 && canCreateCollection(permissions, 'pages')) {
      pageChildren.push({
        href: formatAdminURL({
          adminRoute,
          path: '/collections/pages/create',
        }),
        icon: 'page',
        id: 'page-create',
        label: 'Create a page',
      })
    }

    items.push({
      children: pageChildren,
      href: formatAdminURL({
        adminRoute,
        path: '/collections/pages',
      }),
      icon: 'pages',
      id: 'pages',
      label: 'Pages',
    })
  }

  const collectionChildren = contentCollections
    .filter((item) => canReadCollection(permissions, item.slug))
    .map((item) => collectionItem(adminRoute, item))

  if (collectionChildren.length > 0) {
    items.push({
      children: collectionChildren,
      icon: 'collections',
      id: 'content',
      label: 'Content',
    })
  }

  const adminChildren: DashboardSidebarNavItem[] = [
    ...(canReadGlobal(permissions, 'site-settings')
      ? [
          {
            href: formatAdminURL({
              adminRoute,
              path: '/globals/site-settings',
            }),
            icon: 'settings' as const,
            id: 'global-site-settings',
            label: 'Site settings',
          },
        ]
      : []),
    ...adminCollections
      .filter((item) => canReadCollection(permissions, item.slug))
      .map((item) => collectionItem(adminRoute, item)),
  ]

  if (adminChildren.length > 0) {
    items.push({
      children: adminChildren,
      icon: 'admin',
      id: 'admin',
      label: 'Admin',
    })
  }

  return <DashboardSidebarNavClient items={items} />
}
