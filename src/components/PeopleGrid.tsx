'use client'

import { useState } from 'react'
import Image from 'next/image'

type Person = {
  id: number
  name: string
  role?: string
  linkedIn?: string
  photo?: { url: string } | null
  company?: { name: string } | null
}

export function PeopleGrid({ people }: { people: Person[] }) {
  const [activeRole, setActiveRole] = useState<string | null>(null)

  // Extract unique roles
  const roles = [...new Set(people.map((p) => p.role).filter(Boolean))] as string[]
  roles.sort()

  const filtered = activeRole ? people.filter((p) => p.role === activeRole) : people

  return (
    <>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 pb-10">
        <button
          onClick={() => setActiveRole(null)}
          className={`px-4 py-2 text-caption rounded-full transition-colors cursor-pointer ${
            !activeRole ? 'bg-content text-background' : 'bg-background-alt text-muted hover:text-content'
          }`}
        >
          All
        </button>
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(activeRole === role ? null : role)}
            className={`px-4 py-2 text-caption rounded-full transition-colors cursor-pointer ${
              activeRole === role ? 'bg-content text-background' : 'bg-background-alt text-muted hover:text-content'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Grid — flows top-to-bottom per column */}
      <div className="columns-1 tablet:columns-2 desktop:columns-3 gap-10">
        {filtered.map((person) => {
          const photo = person.photo as any
          const href = person.linkedIn || null

          const content = (
            <div className="flex items-center gap-3 group">
              {photo?.url ? (
                <div className="w-10 h-10 rounded-full shrink-0 relative overflow-hidden after:absolute after:inset-0 after:rounded-full after:border after:border-border after:pointer-events-none">
                  <Image
                    src={photo.url}
                    alt={person.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-background-alt shrink-0 flex items-center justify-center text-muted text-sm">
                  {person.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <h4 className="truncate">{person.name}</h4>
                {href && (
                  <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                )}
              </div>
            </div>
          )

          return (
            <div key={person.id} className="py-3 break-inside-avoid">
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
