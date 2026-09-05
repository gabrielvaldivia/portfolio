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

const editedDateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
})

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
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <section className="collections page-dashboard" aria-label="Pages">
      <div className="collections__wrap">
        {recentPages.length > 0 ? (
          <div className="collections__group recent-pages-dashboard">
            <h2 className="collections__label">Recently edited</h2>
            <ul className="collections__card-list recent-pages-dashboard__list">
              {recentPages.map((page) => {
                const href = formatAdminURL({
                  adminRoute,
                  path: `/collections/pages/${page.id}`,
                })

                return (
                  <li key={page.id}>
                    <a
                      aria-label={`Edit ${page.title || page.slug || 'page'}`}
                      className="card card--has-onclick page-dashboard__card recent-pages-dashboard__card"
                      href={href}
                    >
                      <span className="card__title page-dashboard__title">
                        {page.title || page.slug || 'Untitled page'}
                      </span>
                      <time className="page-dashboard__meta" dateTime={page.updatedAt}>
                        Edited {editedDateFormatter.format(new Date(page.updatedAt))}
                      </time>
                    </a>
                  </li>
                )
              })}
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
                      className="card card--has-onclick page-dashboard__card"
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
