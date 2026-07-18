import type { WidgetServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

type DashboardPage = {
  id: number | string
  slug?: string | null
  status?: string | null
  title?: string | null
}

function formatPageSlug(slug?: string | null) {
  if (!slug) return null
  if (slug === 'home') return '/'
  return `/${slug.replace(/^\/+/, '')}`
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
      slug: true,
      status: true,
      title: true,
    },
    sort: 'order',
  })
  const pages = docs as DashboardPage[]

  return (
    <section className="collections page-dashboard" aria-label="Pages">
      <div className="collections__wrap">
        <div className="collections__group">
          <h2 className="collections__label">Pages</h2>
          {pages.length > 0 ? (
            <ul className="collections__card-list page-dashboard__list">
              {pages.map((page) => {
                const slug = formatPageSlug(page.slug)
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
                        {page.status ? <span>{page.status}</span> : null}
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
