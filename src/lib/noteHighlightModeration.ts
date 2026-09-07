import { sql } from '@payloadcms/db-postgres'
import { HighlightError, highlightRows, isHighlightingPaused, loadHighlightGroups, withHighlightLock, type HighlightDB, type HighlightWriteDB } from './noteHighlightStore'

export type HighlightModerationAction =
  | { action: 'pause'; paused: boolean }
  | { action: 'remove-passage'; anchorKey: string }
  | { action: 'remove-reader' | 'block-reader' | 'unblock-reader'; readerId: string }

export type HighlightModerationState = {
  paused: boolean
  passages: {
    key: string; quote: string
    readers: { id: string; location: string | null; createdAt: string }[]
  }[]
  blockedReaders: { id: string; location: string | null; createdAt: string }[]
}

export function requireHighlightModerator(user: { collection?: string } | null | undefined) {
  if (!user || user.collection !== 'users') throw new HighlightError('Sign in to manage highlights.', 401)
}

export function parseHighlightModerationAction(input: unknown): HighlightModerationAction {
  if (!input || typeof input !== 'object') throw new HighlightError('Invalid moderation action.', 400)
  const value = input as Record<string, unknown>
  if (value.action === 'pause' && typeof value.paused === 'boolean') return { action: 'pause', paused: value.paused }
  const validKey = (key: unknown): key is string => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key)
  if (value.action === 'remove-passage' && validKey(value.anchorKey)) return { action: value.action, anchorKey: value.anchorKey }
  if ((value.action === 'remove-reader' || value.action === 'block-reader' || value.action === 'unblock-reader') && validKey(value.readerId)) {
    return { action: value.action, readerId: value.readerId }
  }
  throw new HighlightError('Invalid moderation action.', 400)
}

/** Anonymous identifiers are returned only by the authenticated admin endpoint. */
export async function loadHighlightModeration(db: HighlightDB, noteId: number): Promise<HighlightModerationState> {
  const passages = await db.execute(sql`
    SELECT anchor_key AS key, quote,
      jsonb_agg(jsonb_build_object('id', visitor_hash, 'location', location, 'createdAt', created_at) ORDER BY created_at) AS readers
    FROM note_highlights WHERE note_id = ${noteId}
    GROUP BY anchor_key, quote ORDER BY max(created_at) DESC, anchor_key
  `)
  const blocks = await db.execute(sql`
    SELECT visitor_hash AS id, location, created_at AS "createdAt"
    FROM note_highlight_blocks WHERE note_id = ${noteId} ORDER BY created_at DESC, visitor_hash
  `)
  return {
    paused: await isHighlightingPaused(db, noteId),
    passages: highlightRows<HighlightModerationState['passages'][number]>(passages),
    blockedReaders: highlightRows<HighlightModerationState['blockedReaders'][number]>(blocks),
  }
}

export async function moderateHighlights(db: HighlightWriteDB, noteId: number, text: string, action: HighlightModerationAction) {
  return withHighlightLock(db, noteId, async (tx) => {
    switch (action.action) {
      case 'pause':
        await tx.execute(sql`
          INSERT INTO note_highlight_settings (note_id, paused) VALUES (${noteId}, ${action.paused})
          ON CONFLICT (note_id) DO UPDATE SET paused = excluded.paused
        `)
        break
      case 'remove-passage': {
        // Also remove old anchors that now resolve to the same passage after edits.
        const groups = await loadHighlightGroups(tx, noteId, text, '')
        const keys = groups.find(group => group.keys.includes(action.anchorKey))?.keys || [action.anchorKey]
        await tx.execute(sql`DELETE FROM note_highlights WHERE note_id = ${noteId}
          AND anchor_key IN (${sql.join(keys.map(key => sql`${key}`), sql`, `)})`)
        break
      }
      case 'block-reader': {
        const result = await tx.execute(sql`SELECT location FROM note_highlights
          WHERE note_id = ${noteId} AND visitor_hash = ${action.readerId} ORDER BY created_at DESC LIMIT 1`)
        const reader = highlightRows<{ location: string | null }>(result)[0]
        if (!reader) throw new HighlightError('This reader’s highlights have already been removed. Refresh and try again.', 409)
        await tx.execute(sql`INSERT INTO note_highlight_blocks (note_id, visitor_hash, location)
          VALUES (${noteId}, ${action.readerId}, ${reader.location}) ON CONFLICT DO NOTHING`)
        await tx.execute(sql`DELETE FROM note_highlights WHERE note_id = ${noteId} AND visitor_hash = ${action.readerId}`)
        break
      }
      case 'remove-reader':
        await tx.execute(sql`DELETE FROM note_highlights WHERE note_id = ${noteId} AND visitor_hash = ${action.readerId}`)
        break
      case 'unblock-reader':
        await tx.execute(sql`DELETE FROM note_highlight_blocks WHERE note_id = ${noteId} AND visitor_hash = ${action.readerId}`)
        break
    }
    return loadHighlightModeration(tx, noteId)
  })
}
