import type { DashboardViewServerProps } from '@payloadcms/next/views'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

type RecentItem = {
  href: string
  id: string
  label: string
  title: string
  updatedAt: string
}

type RecentCollectionSource = {
  label: string
  slug: string
  titleFields: string[]
}

const recentCollectionSources: RecentCollectionSource[] = [
  { label: 'Page', slug: 'pages', titleFields: ['title', 'slug'] },
  { label: 'Note', slug: 'notes', titleFields: ['title'] },
  { label: 'Project', slug: 'projects', titleFields: ['title', 'slug'] },
  { label: 'Playground', slug: 'side-projects', titleFields: ['title', 'slug'] },
  { label: 'Client', slug: 'clients', titleFields: ['name'] },
  { label: 'Person', slug: 'people', titleFields: ['name'] },
  { label: 'Service', slug: 'services', titleFields: ['title'] },
  { label: 'Conversation', slug: 'conversations', titleFields: ['title'] },
  { label: 'Photo', slug: 'photos', titleFields: ['filename', 'slug'] },
  { label: 'Media', slug: 'media', titleFields: ['alt', 'filename'] },
]

const recentGlobalSources = [
  { label: 'Settings', slug: 'site-settings' },
  { label: 'Timeline', slug: 'timeline' },
]

const editedDateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/New_York',
  year: 'numeric',
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
    if (minutesAgo < 1) return 'Edited just now'
    if (minutesAgo < 60) return `Edited ${minutesAgo} min ago`

    const hoursAgo = Math.floor(minutesAgo / 60)
    return `Edited ${hoursAgo} ${hoursAgo === 1 ? 'hr' : 'hrs'} ago`
  }

  return editedDateFormatter.format(editedAt)
}

function getItemTitle(doc: Record<string, unknown>, fields: string[], fallback: string) {
  for (const field of fields) {
    const value = doc[field]
    if (typeof value === 'string' && value.trim()) return value
  }

  return fallback
}

export async function RecentDashboard({ initPageResult: { req }, permissions }: DashboardViewServerProps) {
  const {
    payload,
    payload: {
      config: {
        routes: { admin: adminRoute },
      },
    },
  } = req

  const readableCollectionSources = recentCollectionSources.filter(
    (source) => permissions?.collections?.[source.slug]?.read,
  )
  const readableGlobalSources = recentGlobalSources.filter(
    (source) => permissions?.globals?.[source.slug]?.read,
  )

  const recentCollectionGroups = await Promise.all(
    readableCollectionSources.map(async (source): Promise<RecentItem[]> => {
      try {
        const result = await payload.find({
          collection: source.slug,
          depth: 0,
          limit: 10,
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

          return [
            {
              href: formatAdminURL({
                adminRoute,
                path: `/collections/${source.slug}/${doc.id}`,
              }),
              id: `${source.slug}-${doc.id}`,
              label: source.label,
              title: getItemTitle(doc, source.titleFields, `Untitled ${source.label.toLowerCase()}`),
              updatedAt: doc.updatedAt,
            },
          ]
        })
      } catch {
        return []
      }
    }),
  )

  const recentGlobalItems = await Promise.all(
    readableGlobalSources.map(async (source): Promise<RecentItem | null> => {
      try {
        const global = (await payload.findGlobal({
          slug: source.slug,
          depth: 0,
          overrideAccess: false,
          req,
          select: { updatedAt: true },
        } as any)) as unknown as Record<string, unknown>

        if (typeof global.updatedAt !== 'string') return null

        return {
          href: formatAdminURL({
            adminRoute,
            path: `/globals/${source.slug}`,
          }),
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

  const recentItems = [
    ...recentCollectionGroups.flat(),
    ...recentGlobalItems.filter((item): item is RecentItem => item !== null),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30)

  const emptyStateHref = readableCollectionSources[0]
    ? formatAdminURL({
        adminRoute,
        path: `/collections/${readableCollectionSources[0].slug}`,
      })
    : readableGlobalSources[0]
      ? formatAdminURL({
          adminRoute,
          path: `/globals/${readableGlobalSources[0].slug}`,
        })
      : null

  return (
    <>
      <SetStepNav nav={[{ label: 'Recent' }]} />
      <Gutter className="dashboard recent-dashboard">
        <section aria-label="Recently edited content" className="recent-dashboard__section">
          {recentItems.length > 0 ? (
            <ul className="recent-dashboard__list">
              {recentItems.map((item) => (
                <li className="recent-dashboard__item" key={item.id}>
                  <a aria-label={`Edit ${item.title}`} className="recent-dashboard__link" href={item.href}>
                    <span className="recent-dashboard__title">{item.title}</span>
                    <span className="recent-dashboard__details">
                      <span className="recent-dashboard__type">{item.label}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={item.updatedAt}>{formatEditedTime(item.updatedAt)}</time>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="recent-dashboard__empty">
              <p>No recent edits yet.</p>
              {emptyStateHref ? <a href={emptyStateHref}>Browse content</a> : null}
            </div>
          )}
        </section>
      </Gutter>
    </>
  )
}
