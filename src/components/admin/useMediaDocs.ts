'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MediaDoc } from '@/lib/blockEditor'

/** Loads media documents the form only holds by ID, caching them for the page. */
export function useMediaDocs(ids: string[]) {
  const [docs, setDocs] = useState<Record<string, MediaDoc>>({})
  const missing = ids.filter((id) => !docs[id]).sort().join(',')

  useEffect(() => {
    if (!missing) return
    const controller = new AbortController()
    const query = new URLSearchParams({ 'where[id][in]': missing, limit: '100', depth: '0' })
    fetch(`/api/media?${query}`, { credentials: 'include', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((result: { docs?: MediaDoc[] }) => {
        setDocs((current) => {
          const next = { ...current }
          for (const doc of result.docs || []) next[String(doc.id)] = doc
          return next
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [missing])

  const remember = useCallback((doc: MediaDoc) => setDocs((current) => ({ ...current, [String(doc.id)]: doc })), [])
  return { docs, remember }
}
