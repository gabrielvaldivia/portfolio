'use client'

import { HScrollContainer } from '@/components/HScrollContainer'
import Link from 'next/link'
import { useState } from 'react'

type Client = {
  id: number | string
  name: string
  description?: string | null
  website?: string | null
  tags: string[]
  linkType?: string | null
  page?: {
    relationTo?: string | null
    value?: {
      slug?: string | null
    } | null
  } | null
}

const normalizeTag = (tag: string) => tag.trim().toLocaleLowerCase()

export function ClientsList({ clients }: { clients: Client[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const tagsByKey = new Map<string, string>()

  clients.forEach((client) => {
    client.tags.forEach((tag) => {
      const label = tag.trim()
      if (label) tagsByKey.set(normalizeTag(label), label)
    })
  })

  const tags = [...tagsByKey.entries()].sort(([, a], [, b]) => a.localeCompare(b))
  const filteredClients = activeTag
    ? clients.filter((client) => client.tags.some((tag) => normalizeTag(tag) === activeTag))
    : clients

  const grouped = filteredClients.reduce<Record<string, Client[]>>((groups, client) => {
    const letter = client.name.charAt(0).toUpperCase()
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(client)
    return groups
  }, {})

  return (
    <>
      {tags.length > 0 && (
        <HScrollContainer className="pb-10">
          <div className="flex w-max gap-2" aria-label="Filter clients by tag">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              aria-pressed={!activeTag}
              className={`shrink-0 whitespace-nowrap px-4 py-2 text-caption rounded-full transition-colors cursor-pointer ${
                !activeTag ? 'bg-content text-background' : 'bg-background-alt text-muted hover:text-content'
              }`}
            >
              All
            </button>
            {tags.map(([tagKey, tagLabel]) => (
              <button
                type="button"
                key={tagKey}
                onClick={() => setActiveTag(activeTag === tagKey ? null : tagKey)}
                aria-pressed={activeTag === tagKey}
                className={`shrink-0 whitespace-nowrap px-4 py-2 text-caption rounded-full transition-colors cursor-pointer ${
                  activeTag === tagKey ? 'bg-content text-background' : 'bg-background-alt text-muted hover:text-content'
                }`}
              >
                {tagLabel}
              </button>
            ))}
          </div>
        </HScrollContainer>
      )}

      <div className="space-y-0">
        {Object.entries(grouped).sort().map(([letter, letterClients]) => (
          <div key={letter} className="flex gap-4">
            <div className="w-[40px] tablet:w-[100px] shrink-0">
              <h4 className="text-muted sticky top-5 py-4">{letter}</h4>
            </div>
            <div className="flex-1">
              {letterClients.map((client) => {
                const clientPage = client.page?.value
                const pageCollection = client.page?.relationTo
                const isInternal = client.linkType === 'internal'
                const href = isInternal && clientPage?.slug
                  ? (pageCollection === 'projects' ? `/work/${clientPage.slug}` : `/${clientPage.slug}`)
                  : client.website
                    ? (client.website.startsWith('http') ? client.website : `https://${client.website}`)
                    : null
                const linkContent = (
                  <>
                    <h4 className="shrink-0">{client.name}</h4>
                    {client.description ? (
                      <p className="text-muted hidden tablet:inline-flex tablet:items-baseline tablet:gap-2">
                        {client.description}
                        <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <path d="M7 17L17 7M17 7H9M17 7V15" />
                        </svg>
                      </p>
                    ) : (
                      <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity hidden tablet:block translate-y-[3px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M7 17L17 7M17 7H9M17 7V15" />
                      </svg>
                    )}
                  </>
                )

                return (
                  <div key={client.id} className="py-4 flex items-baseline gap-4 group">
                    {href && isInternal ? (
                      <Link href={href} className="flex items-baseline gap-2 hover:opacity-60 transition-colors">{linkContent}</Link>
                    ) : href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-baseline gap-2 hover:opacity-60 transition-colors">{linkContent}</a>
                    ) : (
                      <>
                        <h4 className="shrink-0">{client.name}</h4>
                        {client.description && (
                          <p className="text-muted hidden tablet:block">{client.description}</p>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
