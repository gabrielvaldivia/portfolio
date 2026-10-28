'use client'

import { UploadField, useField, useFormFields } from '@payloadcms/ui'
import type { UploadFieldClientComponent } from 'payload'
import { reduceFieldsToValues } from 'payload/shared'
import { useMemo } from 'react'
import { mediaId, type MediaDoc } from '@/lib/blockEditor'
import { useMediaDocs } from './useMediaDocs'
import './ShareImageField.scss'

function isShareable(doc: MediaDoc | undefined) {
  return Boolean(doc?.url && doc.mimeType?.startsWith('image/') && doc.mimeType !== 'image/svg+xml')
}

function thumbnail(doc: MediaDoc) {
  const sizes = doc.sizes as Record<string, { url?: string | null } | undefined> | undefined
  return sizes?.og?.url || sizes?.small?.url || doc.url || ''
}

/** Picks the link-preview image from the project's own images, defaulting to the first one. */
export const ShareImageField: UploadFieldClientComponent = (props) => {
  const { value, setValue, disabled } = useField({ potentiallyStalePath: props.path })
  const content = useFormFields(([fields]) => (reduceFieldsToValues(fields, true) as { content?: unknown }).content)
  const featured = useFormFields(([fields]) => fields.featuredImage?.value)
  const readOnly = Boolean(props.readOnly || disabled)

  const candidateIds = useMemo(() => {
    const ids: string[] = []
    for (const block of Array.isArray(content) ? content : []) {
      const id = mediaId((block as { image?: unknown } | null)?.image)
      if (id && !ids.includes(id)) ids.push(id)
    }
    const featuredId = mediaId(featured)
    if (featuredId && !ids.includes(featuredId)) ids.push(featuredId)
    return ids
  }, [content, featured])

  const { docs } = useMediaDocs(candidateIds)
  const candidates = candidateIds.map((id) => docs[id]).filter(isShareable) as MediaDoc[]
  const selectedId = mediaId(value)
  const automatic = candidates[0]

  return (
    <div className="share-image-field">
      <div className="share-image-field__label">Share image</div>
      <p className="share-image-field__description">
        Shown when this page is shared in Messages, Slack, X and other apps. Automatic uses the first image in Content.
      </p>
      <div className="share-image-field__grid" role="radiogroup" aria-label="Share image">
        <button
          type="button"
          role="radio"
          aria-checked={!selectedId}
          disabled={readOnly}
          className="share-image-field__option"
          onClick={() => setValue(null)}
        >
          {automatic ? <img src={thumbnail(automatic)} alt="" /> : <span className="share-image-field__blank" />}
          <span>Automatic</span>
        </button>
        {candidates.map((doc) => (
          <button
            key={doc.id}
            type="button"
            role="radio"
            aria-checked={selectedId === String(doc.id)}
            disabled={readOnly}
            className="share-image-field__option"
            onClick={() => setValue(doc.id)}
            title={typeof doc.alt === 'string' ? doc.alt : undefined}
          >
            <img src={thumbnail(doc)} alt="" />
            <span>{typeof doc.alt === 'string' && doc.alt ? doc.alt : `Image ${doc.id}`}</span>
          </button>
        ))}
      </div>
      <UploadField {...props} field={{ ...props.field, label: 'Or choose another image' }} />
    </div>
  )
}
