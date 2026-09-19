import type { Metadata } from 'next'
import { changelogEntries } from '@/data/changelog'

const description = 'A running history of this website. New features, small refinements, and everything in between.'

// Deliberately unlisted: do not add this experiment to navigation, the sitemap,
// or the agent-readable indexes until it is ready to be introduced publicly.
export const metadata: Metadata = {
  title: 'Changelog — Gabriel Valdivia',
  description,
  robots: { index: false, follow: false },
  openGraph: { title: 'Changelog — Gabriel Valdivia', description },
  twitter: { title: 'Changelog — Gabriel Valdivia', description },
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`))
}

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-8 tablet:px-10 tablet:pb-40 tablet:pt-16">
      <header className="mb-8 tablet:mb-12">
        <h1 className="text-balance">Changelog</h1>
      </header>

      <div>
        {changelogEntries.map((entry, index) => (
          <article key={entry.date} aria-labelledby={`update-${entry.date}`} className="pb-8 tablet:pb-10">
            {index > 0 && (
              <div aria-hidden="true" className="tablet:grid tablet:grid-cols-4 tablet:gap-x-8">
                <div className="border-t border-border tablet:col-span-3 tablet:col-start-2" />
              </div>
            )}
            <header className="grid gap-4 pt-8 tablet:sticky tablet:top-0 tablet:z-10 tablet:grid-cols-4 tablet:gap-8 tablet:bg-background tablet:pb-4 tablet:pt-10">
              <div>
                <time dateTime={entry.date} className="text-caption tabular-nums text-text-muted">
                  {formatDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                </time>
              </div>
              <h2 id={`update-${entry.date}`} className="min-w-0 !text-h4 !font-medium text-balance tablet:col-span-3 tablet:pr-16 desktop:pr-0">
                {entry.title}
              </h2>
            </header>
            <div className="tablet:grid tablet:grid-cols-4 tablet:gap-x-8">
              <div className="min-w-0 tablet:col-span-3 tablet:col-start-2">
                <ul className="mt-4 space-y-3 text-body text-text-body tablet:mt-0">
                  {entry.changes.map((change) => (
                    <li key={change} className="relative pl-5 text-pretty before:absolute before:left-0 before:top-0 before:text-text-subtle before:content-['–']">
                      {change}
                    </li>
                  ))}
                </ul>
                {entry.commits.length > 0 && (
                  <details className="mt-5 text-caption text-text-muted">
                    <summary className="w-fit cursor-pointer hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content">
                      {entry.commits.length} {entry.commits.length === 1 ? 'commit' : 'commits'}
                      <span className="sr-only"> from {formatDate(entry.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </summary>
                    <ul className="mt-4 space-y-3 border-l border-border pl-4">
                      {entry.commits.map((commit) => (
                        <li key={commit.hash} className="text-pretty">
                          <span>{commit.subject}</span>
                          <span className="ml-2 whitespace-nowrap font-mono text-xs tabular-nums text-text-subtle">{commit.hash.slice(0, 7)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-12 max-w-xl border-t border-border pt-6 text-caption text-pretty text-text-muted">
        Updates are grouped by day, with earlier entries reconstructed from the repository’s history. Commit details are added after changes are recorded and may differ from when they went live. Content edits made only in the CMS aren’t included.
      </p>
    </div>
  )
}
