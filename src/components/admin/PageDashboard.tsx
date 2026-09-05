import type { WidgetServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { getPagePath, sortPagesByOrder } from '@/lib/pageOrdering'

type DashboardPage = {
  id: number | string
  order?: number | null
  slug?: string | null
  title?: string | null
  updatedAt: string
}

type DashboardCardIcon = 'calendar' | 'document' | 'folder' | 'gear' | 'grid' | 'link' | 'people' | 'upload'

type RecentItem = {
  href: string
  icon: DashboardCardIcon
  id: string
  label: string
  title: string
  updatedAt: string
}

type RecentCollectionSource = {
  icon: DashboardCardIcon
  label: string
  slug: string
  titleFields: string[]
}

const recentCollectionSources: RecentCollectionSource[] = [
  { icon: 'document', label: 'Note', slug: 'notes', titleFields: ['title'] },
  { icon: 'folder', label: 'Project', slug: 'projects', titleFields: ['title', 'slug'] },
  { icon: 'grid', label: 'Playground', slug: 'side-projects', titleFields: ['title', 'slug'] },
  { icon: 'people', label: 'Client', slug: 'clients', titleFields: ['name'] },
  { icon: 'people', label: 'Person', slug: 'people', titleFields: ['name'] },
  { icon: 'gear', label: 'Service', slug: 'services', titleFields: ['title'] },
  { icon: 'link', label: 'Conversation', slug: 'conversations', titleFields: ['title'] },
  { icon: 'upload', label: 'Photo', slug: 'photos', titleFields: ['filename', 'slug'] },
  { icon: 'upload', label: 'Media', slug: 'media', titleFields: ['alt', 'filename'] },
]

const recentGlobalSources = [
  { icon: 'gear' as const, label: 'Settings', slug: 'site-settings' },
  { icon: 'calendar' as const, label: 'Timeline', slug: 'timeline' },
]

const editedDateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
})

function getItemTitle(doc: Record<string, unknown>, fields: string[], fallback: string) {
  for (const field of fields) {
    const value = doc[field]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return fallback
}

export async function PageDashboard({ permissions, req }: WidgetServerProps) {
  if (!permissions?.collections?.pages?.read) {
    return null
  }

  const {
    payload,
    payload: {
      config: {
        routes: { admin: adminRoute },
      },
    },
  } = req

  const { docs } = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    req,
    select: {
      order: true,
      slug: true,
      title: true,
      updatedAt: true,
    },
    sort: 'order',
  })
  const pages = sortPagesByOrder(docs as DashboardPage[])
  const recentCollectionGroups = await Promise.all(
    recentCollectionSources
      .filter((source) => permissions?.collections?.[source.slug]?.read)
      .map(async (source): Promise<RecentItem[]> => {
        try {
          const result = await payload.find({
            collection: source.slug,
            depth: 0,
            limit: 5,
            overrideAccess: false,
            pagination: false,
            req,
            select: Object.fromEntries([
              ...source.titleFields.map((field) => [field, true]),
              ['updatedAt', true],
            ]),
            sort: '-updatedAt',
          } as any)

          return (result.docs as unknown as Array<Record<string, unknown>>).flatMap((doc) => {
            if ((typeof doc.id !== 'number' && typeof doc.id !== 'string') || typeof doc.updatedAt !== 'string') {
              return []
            }

            return [{
              href: formatAdminURL({
                adminRoute,
                path: `/collections/${source.slug}/${doc.id}`,
              }),
              icon: source.icon,
              id: `${source.slug}-${doc.id}`,
              label: source.label,
              title: getItemTitle(doc, source.titleFields, `Untitled ${source.label.toLowerCase()}`),
              updatedAt: doc.updatedAt,
            }]
          })
        } catch {
          return []
        }
      }),
  )
  const recentGlobalItems = await Promise.all(
    recentGlobalSources
      .filter((source) => permissions?.globals?.[source.slug]?.read)
      .map(async (source): Promise<RecentItem | null> => {
        try {
          const global = await payload.findGlobal({
            slug: source.slug,
            depth: 0,
            overrideAccess: false,
            req,
            select: { updatedAt: true },
          } as any) as unknown as Record<string, unknown>

          if (typeof global.updatedAt !== 'string') {
            return null
          }

          return {
            href: formatAdminURL({
              adminRoute,
              path: `/globals/${source.slug}`,
            }),
            icon: source.icon,
            id: `global-${source.slug}`,
            label: 'Global',
            title: source.label,
            updatedAt: global.updatedAt,
          }
        } catch {
          return null
        }
      }),
  )
  const recentItems: RecentItem[] = [
    ...pages.map((page) => ({
      href: formatAdminURL({ adminRoute, path: `/collections/pages/${page.id}` }),
      icon: 'document' as const,
      id: `pages-${page.id}`,
      label: 'Page',
      title: page.title || page.slug || 'Untitled page',
      updatedAt: page.updatedAt,
    })),
    ...recentCollectionGroups.flat(),
    ...recentGlobalItems.filter((item): item is RecentItem => item !== null),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <section className="collections page-dashboard" aria-label="Content">
      <div className="collections__wrap">
        {recentItems.length > 0 ? (
          <div className="collections__group recent-content-dashboard">
            <h2 className="collections__label">Recently edited</h2>
            <ul className="collections__card-list recent-content-dashboard__list">
              {recentItems.map((item) => (
                <li key={item.id}>
                  <a
                    aria-label={`Edit ${item.title}`}
                    className={`card card--has-onclick page-dashboard__card dashboard-card--with-icon dashboard-card--icon-${item.icon} recent-content-dashboard__card`}
                    href={item.href}
                  >
                    <span className="card__title page-dashboard__title">{item.title}</span>
                    <span className="page-dashboard__meta">
                      {item.label} · <time dateTime={item.updatedAt}>Edited {editedDateFormatter.format(new Date(item.updatedAt))}</time>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="collections__group">
          <h2 className="collections__label">Pages</h2>
          {pages.length > 0 ? (
            <ul className="collections__card-list page-dashboard__list">
              {pages.map((page) => {
                const slug = getPagePath(page.slug)
                const href = formatAdminURL({
                  adminRoute,
                  path: `/collections/pages/${page.id}`,
                })

                return (
                  <li key={page.id}>
                    <a
                      aria-label={`Edit ${page.title || page.slug || 'page'}`}
                      className="card card--has-onclick page-dashboard__card dashboard-card--with-icon dashboard-card--icon-document"
                      href={href}
                      id={`card-page-${page.slug || page.id}`}
                    >
                      <span className="card__title page-dashboard__title">
                        {page.title || page.slug || 'Untitled page'}
                      </span>
                      <span className="page-dashboard__meta">
                        {slug ? <span>{slug}</span> : null}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : (
            <a
              className="card card--has-onclick page-dashboard__card page-dashboard__card--empty"
              href={formatAdminURL({
                adminRoute,
                path: '/collections/pages/create',
              })}
              id="card-page-create"
            >
              <span className="card__title page-dashboard__title">Create a page</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
