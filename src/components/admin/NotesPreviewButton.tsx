'use client'

import {
  FormSubmit,
  toast,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormModified,
  useLivePreviewContext,
  useLocale,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useRef, useState } from 'react'

export function NotesPreviewButton() {
  const { config: { routes: { api } } } = useConfig()
  const { id, data, hasPublishPermission, setUnpublishedVersionCount, uploadStatus } = useDocumentInfo()
  const { submit } = useForm()
  const modified = useFormModified()
  const { code: locale } = useLocale()
  const { previewURL } = useLivePreviewContext()
  const [opening, setOpening] = useState(false)
  const inFlight = useRef(false)
  const schedule = typeof data?.scheduledFor === 'string' ? data.scheduledFor : null

  async function openPreview() {
    if (!id || !previewURL || inFlight.current || uploadStatus === 'uploading') return
    inFlight.current = true
    setOpening(true)

    // Open during the click so saving asynchronously won't trigger popup blocking.
    const preview = window.open('about:blank', '_blank')
    if (preview) preview.opener = null

    try {
      if (modified) {
        const query = new URLSearchParams({ depth: '0', 'fallback-locale': 'null', draft: 'true' })
        if (locale) query.set('locale', locale)
        const result = await submit({
          action: formatAdminURL({ apiRoute: api, path: `/notes/${id}?${query}` }),
          method: 'PATCH',
          overrides: { _status: 'draft' },
          skipValidation: true,
          disableSuccessStatus: true,
        })
        if (!result?.res?.ok) {
          preview?.close()
          return
        }
        setUnpublishedVersionCount((count) => count + 1)
      }

      if (preview && !preview.closed) {
        preview.location.replace(previewURL)
      } else {
        // Still provide a working preview when a browser blocks new tabs.
        window.location.assign(previewURL)
      }
    } catch {
      preview?.close()
      toast.error('Could not save and open the preview. Please try again.')
    } finally {
      inFlight.current = false
      setOpening(false)
    }
  }

  return (
    <div className="notes-preview-controls">
      {hasPublishPermission && schedule && <span className="notes-schedule-status" role="status">
        Scheduled for {new Date(schedule).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
        })}
      </span>}
      <FormSubmit
        buttonId="action-preview"
        buttonStyle="secondary"
        disabled={!id || !previewURL || opening || uploadStatus === 'uploading'}
        onClick={() => { void openPreview() }}
        size="medium"
        type="button"
      >
        {opening ? 'Opening…' : 'Preview'}
      </FormSubmit>
    </div>
  )
}
