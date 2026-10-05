import type { CollectionConfig, GlobalConfig, PayloadRequest } from 'payload'
import { BACKGROUND_WORK_CACHE_TAG, PUBLIC_CONTENT_CACHE_TAGS } from './contentCacheTags'

const publicCollections = new Set([
  'pages', 'notes', 'projects', 'side-projects', 'clients', 'people',
  'services', 'photos', 'media',
])

type RevalidationOptions = { tags: readonly string[]; pages: boolean }
const scheduledRequests = new WeakMap<PayloadRequest, { tags: Set<string>; pages: boolean }>()
type ScheduleRevalidation = (req: PayloadRequest, options: RevalidationOptions) => void | Promise<void>
const publicContent = { tags: PUBLIC_CONTENT_CACHE_TAGS, pages: true }
const noteContent = { tags: [...PUBLIC_CONTENT_CACHE_TAGS, BACKGROUND_WORK_CACHE_TAG], pages: true }
const draftContent = { tags: ['gallery-photos', 'activity-targets', BACKGROUND_WORK_CACHE_TAG], pages: false }

/** Run after the response so Payload's transaction has committed before a cache miss. */
async function scheduleContentRevalidation(req: PayloadRequest, options: RevalidationOptions) {
  const existing = scheduledRequests.get(req)
  if (existing) {
    for (const tag of options.tags) existing.tags.add(tag)
    existing.pages ||= options.pages
    return
  }
  const pending = { tags: new Set(options.tags), pages: options.pages }

  const { after } = await import('next/server')
  try {
    after(async () => {
      const { revalidatePath, revalidateTag } = await import('next/cache')
      for (const tag of pending.tags) {
        revalidateTag(tag, { expire: 0 })
      }
      // CMS relationships can appear on several pages. Invalidate on edits, not visits.
      if (pending.pages) revalidatePath('/', 'layout')
    })
    scheduledRequests.set(req, pending)
  } catch (error) {
    // CLI imports and migrations have no Next.js request. The hourly expiry is a fallback.
    if (error instanceof Error && error.message.includes('outside a request scope')) return
    throw error
  }
}

export function withContentRevalidation(
  collection: CollectionConfig,
  schedule: ScheduleRevalidation = scheduleContentRevalidation,
): CollectionConfig {
  if (!publicCollections.has(collection.slug)) return collection

  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [
        ...(collection.hooks?.afterChange || []),
        async ({ doc, previousDoc, context, req }) => {
          if (collection.slug === 'notes') {
            // Drafts can change scheduling and which photos belong in the gallery,
            // while leaving the public note and its pages unchanged.
            if (context.skipNoteNewsletter) return doc
            if (doc._status !== 'published' && (!context.cancelNoteSchedule || previousDoc?._status !== 'published')) {
              await schedule(req, draftContent)
              return doc
            }
          }
          await schedule(req, collection.slug === 'notes' ? noteContent : publicContent)
          return doc
        },
      ],
      afterDelete: [
        ...(collection.hooks?.afterDelete || []),
        async ({ doc, req }) => {
          // A deleted draft can also remove a previously published version.
          await schedule(req, collection.slug === 'notes' ? noteContent : publicContent)
          return doc
        },
      ],
    },
  }
}

export function withGlobalRevalidation(
  global: GlobalConfig,
  schedule: ScheduleRevalidation = scheduleContentRevalidation,
): GlobalConfig {
  return {
    ...global,
    hooks: {
      ...global.hooks,
      afterChange: [
        ...(global.hooks?.afterChange || []),
        async ({ doc, req }) => {
          await schedule(req, publicContent)
          return doc
        },
      ],
    },
  }
}
