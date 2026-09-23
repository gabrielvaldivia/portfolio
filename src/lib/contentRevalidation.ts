import type { CollectionConfig, GlobalConfig, PayloadRequest } from 'payload'

const publicCollections = new Set([
  'pages', 'notes', 'projects', 'side-projects', 'clients', 'people',
  'services', 'photos', 'media',
])

const scheduledRequests = new WeakSet<PayloadRequest>()
type ScheduleRevalidation = (req: PayloadRequest) => void | Promise<void>

/** Run after the response so Payload's transaction has committed before a cache miss. */
async function scheduleContentRevalidation(req: PayloadRequest) {
  if (scheduledRequests.has(req)) return

  const { after } = await import('next/server')
  try {
    after(async () => {
      const { revalidatePath, revalidateTag } = await import('next/cache')
      for (const tag of ['navigation-pages', 'site-settings', 'footer-social-links']) {
        revalidateTag(tag, { expire: 0 })
      }
      // CMS relationships can appear on several pages. Invalidate on edits, not visits.
      revalidatePath('/', 'layout')
    })
    scheduledRequests.add(req)
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
            // Draft autosaves and the newsletter delivery marker don't change the public note.
            if (context.skipNoteNewsletter) return doc
            if (doc._status !== 'published' && !context.cancelNoteSchedule) return doc
            if (doc._status !== 'published' && previousDoc?._status !== 'published') return doc
          }
          await schedule(req)
          return doc
        },
      ],
      afterDelete: [
        ...(collection.hooks?.afterDelete || []),
        async ({ doc, req }) => {
          // A deleted draft can also remove a previously published version.
          await schedule(req)
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
          await schedule(req)
          return doc
        },
      ],
    },
  }
}
