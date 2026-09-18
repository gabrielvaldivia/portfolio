import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { CollectionBeforeChangeHook, Payload, PayloadRequest } from 'payload'

export function isFuturePublishDate(value: unknown, now = Date.now()) {
  return typeof value === 'string' && new Date(value).getTime() > now
}

/** A future publish request saves a private draft with an explicit schedule. */
export const prepareNotePublication: CollectionBeforeChangeHook = async ({ data, originalDoc, req, context }) => {
  let saved = originalDoc
  if (originalDoc?.id) {
    const { sql } = await import('@payloadcms/db-postgres')
    const transactionID = await req.transactionID
    const transaction = transactionID && req.payload.db.sessions?.[transactionID]?.db as PostgresAdapter['sessions'][string]['db'] | undefined
    if (transaction) await transaction.execute(sql`SELECT id FROM notes WHERE id = ${originalDoc.id} FOR UPDATE`)
    // Use the saved document, not an autosave, as the source of scheduling state.
    saved = await req.payload.findByID({ collection: 'notes', id: originalDoc.id, draft: false,
      depth: 0, overrideAccess: true, req })
  }
  data.scheduledFor = saved?.scheduledFor || null
  data.firstPublishedAt = saved?.firstPublishedAt || null

  if (context.cancelNoteSchedule) {
    data.scheduledFor = null
  } else if (data._status === 'published') {
    const date = data.publishedAt === undefined ? originalDoc?.publishedAt : data.publishedAt
    if (isFuturePublishDate(date)) {
      data._status = 'draft'
      data.scheduledFor = date
    } else {
      data.publishedAt = date || new Date().toISOString()
      data.scheduledFor = null
      data.firstPublishedAt ||= new Date().toISOString()
      // Local API reads may replace req.context; write to its current instance.
      req.context.firstNotePublication = !saved?.firstPublishedAt && saved?._status !== 'published'
    }
  }
  return data
}

/** Lock and publish due drafts in the same transaction, including their versions. */
export async function publishScheduledNotes(payload: Payload, now = new Date()) {
  const { sql } = await import('@payloadcms/db-postgres')
  const published: { id: number; slug: string }[] = []
  for (let count = 0; count < 20; count++) {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('Scheduled publishing requires transactions')
    try {
      const req = { payload, context: {}, transactionID } as PayloadRequest
      const db = payload.db.sessions?.[transactionID]?.db as PostgresAdapter['sessions'][string]['db'] | undefined
      if (!db) throw new Error('Scheduled publishing transaction unavailable')
      const result = await db.execute(sql`
        SELECT id, scheduled_for FROM notes
        WHERE _status = 'draft' AND scheduled_for <= ${now.toISOString()}::timestamptz
        ORDER BY scheduled_for, id LIMIT 1 FOR UPDATE SKIP LOCKED
      `)
      const due = result.rows[0] as { id: number; scheduled_for: string | Date } | undefined
      if (!due) {
        await payload.db.commitTransaction(transactionID)
        break
      }
      const note = await payload.update({ collection: 'notes', id: due.id,
        data: { _status: 'published', publishedAt: new Date(due.scheduled_for).toISOString() },
        draft: false, overrideAccess: true, depth: 0, req })
      await payload.db.commitTransaction(transactionID)
      published.push({ id: due.id, slug: note.slug })
    } catch (error) {
      await payload.db.rollbackTransaction(transactionID)
      throw error
    }
  }
  return published
}
