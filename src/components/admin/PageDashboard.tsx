import type { WidgetServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { getPagePath, sortPagesByOrder } from '@/lib/pageOrdering'

type DashboardPage = {
  bioImage?: unknown
  id: number | string
  meta?: {
    image?: unknown
  } | null
  order?: number | null
  slug?: string | null
  title?: string | null
  updatedAt: string
}

type DashboardCardIcon = 'browser' | 'calendar' | 'document' | 'folder' | 'gear' | 'grid' | 'link' | 'people' | 'upload'

type RecentItem = {
  href: string
  icon: DashboardCardIcon
  id: string
  label: string
  thumbnailURL?: string
  title: string
  updatedAt: string
}

type RecentCollectionSource = {
  icon: DashboardCardIcon
  label: string
  slug: string
  thumbnailFields: string[]
  titleFields: string[]
}

const recentCollectionSources: RecentCollectionSource[] = [
  { icon: 'document', label: 'Note', slug: 'notes', thumbnailFields: ['coverImage'], titleFields: ['title'] },
  { icon: 'folder', label: 'Project', slug: 'projects', thumbnailFields: ['featuredImage'], titleFields: ['title', 'slug'] },
  { icon: 'browser', label: 'Playground', slug: 'side-projects', thumbnailFields: ['featuredImage'], titleFields: ['title', 'slug'] },
  { icon: 'people', label: 'Client', slug: 'clients', thumbnailFields: ['logo'], titleFields: ['name'] },
  { icon: 'people', label: 'Person', slug: 'people', thumbnailFields: ['photo'], titleFields: ['name'] },
  { icon: 'gear', label: 'Service', slug: 'services', thumbnailFields: [], titleFields: ['title'] },
  { icon: 'link', label: 'Conversation', slug: 'conversations', thumbnailFields: [], titleFields: ['title'] },
  { icon: 'upload', label: 'Photo', slug: 'photos', thumbnailFields: ['$self'], titleFields: ['filename', 'slug'] },
  { icon: 'upload', label: 'Media', slug: 'media', thumbnailFields: ['$self'], titleFields: ['alt', 'filename'] },
]

const recentGlobalSources = [
  { icon: 'gear' as const, label: 'Settings', slug: 'site-settings' },
  { icon: 'calendar' as const, label: 'Timeline', slug: 'timeline' },
]

const editedDateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/New_York',
})

const editedDayFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/New_York',
  year: 'numeric',
})

function formatEditedTime(updatedAt: string) {
  const editedAt = new Date(updatedAt)
  const now = new Date()

  if (editedDayFormatter.format(editedAt) === editedDayFormatter.format(now)) {
    const minutesAgo = Math.max(0, Math.floor((now.getTime() - editedAt.getTime()) / 60_000))
    if (minutesAgo < 60) {
      return `Edited ${minutesAgo} min ago`
    }

    return `Edited ${Math.floor(minutesAgo / 60)} hr ago`
  }

  return editedDateFormatter.format(editedAt)
}

function getItemTitle(doc: Record<string, unknown>, fields: string[], fallback: string) {
  for (const field of fields) {
    const value = doc[field]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return fallback
}

function getMediaThumbnail(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const media = value as {
    mimeType?: unknown
    sizes?: { thumbnail?: { url?: unknown } }
    thumbnailURL?: unknown
    url?: unknown
  }
  if (typeof media.mimeType === 'string' && !media.mimeType.startsWith('image/')) {
    return undefined
  }

  const candidates = [media.sizes?.thumbnail?.url, media.thumbnailURL, media.url]
  return candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)
}

function getItemThumbnail(doc: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const thumbnail = getMediaThumbnail(field === '$self' ? doc : doc[field])
    if (thumbnail) {
      return thumbnail
    }
  }

  return undefined
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
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    req,
    select: {
      order: true,
      slug: true,
      title: true,
      updatedAt: true,
      bioImage: true,
      meta: {
        image: true,
      },
    },
    sort: 'order',
  })
  const pages = sortPagesByOrder(docs as DashboardPage[])
  const showTimelineShortcut = Boolean(permissions?.globals?.timeline?.read)
  const recentCollectionGroups = await Promise.all(
    recentCollectionSources
      .filter((source) => permissions?.collections?.[source.slug]?.read)
      .map(async (source): Promise<RecentItem[]> => {
        try {
          const result = await payload.find({
            collection: source.slug,
            depth: 1,
            limit: 5,
            overrideAccess: false,
            pagination: false,
            req,
            select: Object.fromEntries([
              ...source.titleFields.map((field) => [field, true]),
              ...source.thumbnailFields
                .filter((field) => field !== '$self')
                .map((field) => [field, true]),
              ...(source.thumbnailFields.includes('$self')
                ? [['mimeType', true], ['sizes', true], ['thumbnailURL', true], ['url', true]]
                : []),
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
              thumbnailURL: getItemThumbnail(doc, source.thumbnailFields),
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
      icon: 'browser' as const,
      id: `pages-${page.id}`,
      label: 'Page',
      thumbnailURL: getMediaThumbnail(page.meta?.image) || getMediaThumbnail(page.bioImage),
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
                    className={`card card--has-onclick page-dashboard__card dashboard-card--with-icon dashboard-card--icon-${item.icon} ${item.thumbnailURL ? 'dashboard-card--has-thumbnail' : ''} recent-content-dashboard__card`}
                    href={item.href}
                  >
                    {item.thumbnailURL ? (
                      <img alt="" aria-hidden="true" className="dashboard-card__thumbnail" src={item.thumbnailURL} />
                    ) : null}
                    <span className="card__title page-dashboard__title">{item.title}</span>
                    <time className="page-dashboard__meta" dateTime={item.updatedAt}>
                      {formatEditedTime(item.updatedAt)}
                    </time>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="collections__group">
          <h2 className="collections__label">Pages</h2>
          {pages.length > 0 || showTimelineShortcut ? (
            <ul className="collections__card-list page-dashboard__list">
              {pages.map((page) => {
                const slug = getPagePath(page.slug)
                const thumbnailURL = getMediaThumbnail(page.meta?.image) || getMediaThumbnail(page.bioImage)
                const href = formatAdminURL({
                  adminRoute,
                  path: `/collections/pages/${page.id}`,
                })

                return (
                  <li key={page.id}>
                    <a
                      aria-label={`Edit ${page.title || page.slug || 'page'}`}
                      className={`card card--has-onclick page-dashboard__card dashboard-card--with-icon dashboard-card--icon-browser ${thumbnailURL ? 'dashboard-card--has-thumbnail' : ''}`}
                      href={href}
                      id={`card-page-${page.slug || page.id}`}
                    >
                      {thumbnailURL ? (
                        <img alt="" aria-hidden="true" className="dashboard-card__thumbnail" src={thumbnailURL} />
                      ) : null}
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
              {showTimelineShortcut ? (
                <li>
                  <a
                    aria-label="Edit Timeline"
                    className="card card--has-onclick page-dashboard__card dashboard-card--with-icon dashboard-card--icon-calendar"
                    href={formatAdminURL({ adminRoute, path: '/globals/timeline' })}
                    id="card-page-timeline"
                  >
                    <span className="card__title page-dashboard__title">Timeline</span>
                    <span className="page-dashboard__meta">/timeline</span>
                  </a>
                </li>
              ) : null}
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
