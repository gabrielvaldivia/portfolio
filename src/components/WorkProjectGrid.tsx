'use client'

import { HScrollContainer } from '@/components/HScrollContainer'
import { ProjectCard } from '@/components/ProjectCard'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'
import { collectWorkTags, filterProjectsByTag, type WorkTag } from '@/lib/workTags'
import { useEffect, useRef, useState } from 'react'

type WorkProject = {
  id: number | string
  title: string
  slug: string
  subtitle?: string
  featuredImage?: ResponsiveImageMedia
  tags: WorkTag[]
}

const pillClass = (selected: boolean) => `shrink-0 whitespace-nowrap px-4 py-2 text-caption rounded-full transition-colors cursor-pointer ${
  selected ? 'bg-content text-background' : 'bg-background-alt text-text-body hover:text-text-strong'
}`

export function WorkProjectGrid({ projects }: { projects: WorkProject[] }) {
  const tags = collectWorkTags(projects)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const pillsRef = useRef<HTMLDivElement>(null)
  const revealActivePillRef = useRef(false)

  // Read ?tag= after hydration so the page stays statically rendered.
  useEffect(() => {
    const readTag = () => {
      const tag = new URL(window.location.href).searchParams.get('tag')
      setActiveTag(tag && tags.some(item => item.slug === tag) ? tag : null)
      revealActivePillRef.current = true
    }
    readTag()
    window.addEventListener('popstate', readTag)
    return () => window.removeEventListener('popstate', readTag)
  }, [])

  // A tag from the URL may sit past the edge of the scrolling pill row.
  useEffect(() => {
    if (!activeTag || !revealActivePillRef.current) return
    revealActivePillRef.current = false
    pillsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeTag])

  const selectTag = (tag: string | null) => {
    setActiveTag(tag)
    const url = new URL(window.location.href)
    if (tag) url.searchParams.set('tag', tag)
    else url.searchParams.delete('tag')
    window.history.replaceState(window.history.state, '', url)
  }

  const visibleProjects = filterProjectsByTag(projects, activeTag)

  return (
    <>
      {tags.length > 0 && (
        <HScrollContainer className="pb-10">
          <div ref={pillsRef} className="flex w-max gap-2" role="group" aria-label="Filter work by tag">
            <button type="button" onClick={() => selectTag(null)} aria-pressed={!activeTag} className={pillClass(!activeTag)}>
              All
            </button>
            {tags.map(tag => (
              <button
                type="button"
                key={tag.slug}
                onClick={() => selectTag(activeTag === tag.slug ? null : tag.slug)}
                aria-pressed={activeTag === tag.slug}
                className={pillClass(activeTag === tag.slug)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </HScrollContainer>
      )}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
        {visibleProjects.map((project, index) => (
          <ProjectCard
            key={project.id}
            priority={index < 3}
            title={project.title}
            slug={project.slug}
            subtitle={project.subtitle}
            featuredImage={project.featuredImage}
            emphasizeHover
          />
        ))}
      </div>
    </>
  )
}
