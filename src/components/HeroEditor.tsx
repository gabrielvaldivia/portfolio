'use client'

import Image from 'next/image'
import { useMemo, useState, type FormEvent } from 'react'
import type { HeroConfigSlide } from '@/lib/heroConfig'

type ProjectOption = {
  slug: string
  title: string
  subtitle?: string | null
  image?: string | null
}

type Props = {
  projects: ProjectOption[]
  initialSlides: HeroConfigSlide[]
}

export function HeroEditor({ projects, initialSlides }: Props) {
  const [slides, setSlides] = useState(initialSlides)
  const [files, setFiles] = useState<Record<string, File>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const projectsBySlug = useMemo(
    () => new Map(projects.map((project) => [project.slug, project])),
    [projects],
  )
  const selectedSlugs = new Set(slides.map((slide) => slide.slug))
  const availableProjects = projects.filter((project) => !selectedSlugs.has(project.slug))

  const updateSlide = (slug: string, updates: Partial<HeroConfigSlide>) => {
    setSlides((current) => current.map((slide) => (
      slide.slug === slug ? { ...slide, ...updates } : slide
    )))
    setMessage(null)
  }

  const moveSlide = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= slides.length) return

    setSlides((current) => {
      const next = [...current]
      const [slide] = next.splice(index, 1)
      next.splice(targetIndex, 0, slide)
      return next
    })
    setMessage(null)
  }

  const removeSlide = (slug: string) => {
    setSlides((current) => current.filter((slide) => slide.slug !== slug))
    setFiles((current) => {
      const next = { ...current }
      delete next[slug]
      return next
    })
    setMessage(null)
  }

  const addSlide = (slug: string) => {
    setSlides((current) => [...current, {
      slug,
      image: null,
      title: null,
      subtitle: null,
      gradientColor: null,
    }])
    setMessage(null)
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)
    setError(null)

    try {
      const body = new FormData()
      body.append('slides', JSON.stringify(slides))
      for (const [slug, file] of Object.entries(files)) {
        body.append(`image:${slug}`, file)
      }

      const response = await fetch('/api/local-hero', { method: 'POST', body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save the hero configuration.')

      setSlides(result.slides)
      setFiles({})
      setMessage('Saved locally. The config and uploaded images are ready to commit.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the hero configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-12 space-y-16">
      <section aria-labelledby="selected-slides-heading">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 id="selected-slides-heading" className="text-balance text-2xl font-medium">Selected slides</h2>
            <p className="mt-2 text-pretty text-muted">Set each slide’s copy, image, mobile gradient, and order. Project content remains the fallback until you override it here.</p>
          </div>
          <span className="shrink-0 text-sm text-muted tabular-nums">{slides.length} selected</span>
        </div>

        {slides.length ? (
          <ol className="mt-6 space-y-3">
            {slides.map((slide, index) => {
              const project = projectsBySlug.get(slide.slug)
              const preview = slide.image || project?.image
              const pendingFile = files[slide.slug]
              const hasCopyOverride = slide.title != null || slide.subtitle != null

              return (
                <li key={slide.slug} className="grid gap-5 rounded-2xl border border-border-strong bg-background-alt p-4 tablet:grid-cols-[96px_minmax(0,1fr)_auto] tablet:items-start">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-background">
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        fill
                        sizes="(min-width: 810px) 96px, calc(100vw - 72px)"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted">No image</div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm text-muted tabular-nums">{index + 1}</span>
                      <h3 className="truncate text-balance text-xl">{project?.title || slide.slug}</h3>
                    </div>
                    {project?.subtitle ? <p className="mt-1 truncate text-sm text-muted">Project default: {project.subtitle}</p> : null}
                    {hasCopyOverride ? (
                      <button
                        type="button"
                        onClick={() => updateSlide(slide.slug, { title: null, subtitle: null })}
                        className="mt-3 text-sm text-muted underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:text-content"
                      >
                        Use project copy
                      </button>
                    ) : null}

                    <div className="mt-5 grid gap-4 desktop:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Slide title</span>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={slide.title ?? project?.title ?? slide.slug}
                          onChange={(event) => updateSlide(slide.slug, { title: event.target.value })}
                          className="min-h-11 rounded-xl border border-border-strong bg-background px-3 text-base outline-none transition-colors duration-150 focus:border-content"
                        />
                      </label>

                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Slide description</span>
                        <textarea
                          rows={2}
                          maxLength={240}
                          value={slide.subtitle ?? project?.subtitle ?? ''}
                          onChange={(event) => updateSlide(slide.slug, { subtitle: event.target.value })}
                          className="min-h-11 resize-y rounded-xl border border-border-strong bg-background px-3 py-2 text-base outline-none transition-colors duration-150 focus:border-content"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted">Mobile gradient</span>
                      <input
                        type="color"
                        aria-label={`Mobile gradient for ${project?.title || slide.slug}`}
                        disabled={!slide.gradientColor}
                        value={slide.gradientColor || '#181818'}
                        onChange={(event) => updateSlide(slide.slug, { gradientColor: event.target.value })}
                        className="size-10 cursor-pointer rounded-lg border border-border-strong bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-35"
                      />
                      <button
                        type="button"
                        onClick={() => updateSlide(slide.slug, {
                          gradientColor: slide.gradientColor ? null : '#181818',
                        })}
                        className="rounded-full border border-border-strong px-4 py-2 text-sm transition-opacity duration-150 hover:opacity-60"
                      >
                        {slide.gradientColor ? 'Use automatic color' : 'Choose custom color'}
                      </button>
                      <span className="text-sm text-muted">{slide.gradientColor || 'Automatic'}</span>
                    </div>

                    <label className="mt-4 inline-flex cursor-pointer items-center rounded-full border border-border-strong px-4 py-2 text-sm transition-opacity duration-150 hover:opacity-60 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-content">
                      <span>{pendingFile ? pendingFile.name : 'Choose hero image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) setFiles((current) => ({ ...current, [slide.slug]: file }))
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label={`Move ${project?.title || slide.slug} up`}
                      disabled={index === 0}
                      onClick={() => moveSlide(index, -1)}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-border-strong transition-opacity duration-150 hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 10 4-4 4 4" /></svg>
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${project?.title || slide.slug} down`}
                      disabled={index === slides.length - 1}
                      onClick={() => moveSlide(index, 1)}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-border-strong transition-opacity duration-150 hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(slide.slug)}
                      className="rounded-full border border-border-strong px-4 py-2 text-sm transition-opacity duration-150 hover:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border-strong p-8 text-center">
            <p className="text-pretty text-muted">No hero projects selected.</p>
            {availableProjects[0] ? (
              <button type="button" onClick={() => addSlide(availableProjects[0].slug)} className="mt-4 rounded-full border border-border-strong px-4 py-2 text-sm">
                Add the first project
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section aria-labelledby="available-projects-heading">
        <h2 id="available-projects-heading" className="text-balance text-2xl font-medium">Available projects</h2>
        <div className="mt-6 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
          {availableProjects.map((project) => (
            <button
              key={project.slug}
              type="button"
              onClick={() => addSlide(project.slug)}
              className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-border-strong p-4 text-left transition-opacity duration-150 hover:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-medium">{project.title}</span>
                {project.subtitle ? <span className="mt-1 block truncate text-sm text-muted">{project.subtitle}</span> : null}
              </span>
              <span aria-hidden="true" className="text-2xl">+</span>
            </button>
          ))}
        </div>
      </section>

      <div className="sticky bottom-5 z-20 rounded-2xl border border-border-strong bg-elevated p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div aria-live="polite" className="min-h-6 text-sm">
            {error ? <p className="text-red-500">{error}</p> : null}
            {message ? <p className="text-muted">{message}</p> : null}
          </div>
          <button
            type="submit"
            disabled={isSaving || !slides.length}
            className="rounded-full bg-content px-6 py-3 text-sm font-medium text-background transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save locally'}
          </button>
        </div>
      </div>
    </form>
  )
}
