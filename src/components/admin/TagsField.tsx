'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useState, type KeyboardEvent } from 'react'
import './TagsField.scss'

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '') : []
}

/**
 * Tag input for `text` fields with `hasMany`. Payload's built-in version did not add tags on Enter here,
 * so this one handles it directly: Enter, Tab or a comma adds the typed tag; Backspace in an empty box removes the last.
 */
export const TagsField: TextFieldClientComponent = (props) => {
  const { field } = props
  const { path, value, setValue, disabled, showError } = useField<string[]>({ potentiallyStalePath: props.path })
  const [draft, setDraft] = useState('')
  const tags = normalizeTags(value)
  const readOnly = Boolean(props.readOnly || disabled)
  const inputId = `field-${path.replace(/\./g, '__')}`

  const addTags = (text: string) => {
    const next = [...tags]
    for (const part of text.split(',')) {
      const tag = part.trim()
      if (tag && !next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }
    if (next.length !== tags.length) setValue(next)
    setDraft('')
  }

  const removeTag = (index: number) => setValue(tags.filter((_, i) => i !== index))

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if ((event.key === 'Enter' || event.key === ',' || (event.key === 'Tab' && draft.trim())) && draft.trim()) {
      event.preventDefault()
      addTags(draft)
    } else if (event.key === 'Enter') {
      // Never let Enter in this box submit the whole form.
      event.preventDefault()
    } else if (event.key === 'Backspace' && !draft && tags.length) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className={`field-type text tags-field${showError ? ' error' : ''}`}>
      <FieldLabel htmlFor={inputId} label={field.label} path={path} required={field.required} />
      <div className="tags-field__control" onClick={(event) => event.currentTarget.querySelector('input')?.focus()}>
        <FieldError path={path} showError={showError} />
        {tags.map((tag, index) => (
          <span className="tags-field__tag" key={`${tag}-${index}`}>
            {tag}
            {!readOnly && (
              <button type="button" className="tags-field__remove" aria-label={`Remove ${tag}`} onClick={() => removeTag(index)}>
                ×
              </button>
            )}
          </span>
        ))}
        <input
          id={inputId}
          className="tags-field__input rs__input"
          type="text"
          value={draft}
          disabled={readOnly}
          placeholder={tags.length ? '' : 'Type a tag and press Enter'}
          onChange={(event) => {
            // Pasting "a, b, c" adds each tag at once.
            if (event.target.value.includes(',')) addTags(event.target.value)
            else setDraft(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && addTags(draft)}
        />
      </div>
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  )
}
