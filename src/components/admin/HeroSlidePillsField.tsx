'use client'

import { Button, TextField, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'
import { getHeroProjectPills, normalizeHeroPills } from '@/lib/heroProjectPills'
import './HeroSlidePillsField.scss'

export const HeroSlidePillsField: TextFieldClientComponent = props => {
  const { path, value, setValue, disabled } = useField<string[]>({ potentiallyStalePath: props.path })
  const projectPath = path.replace(/\.pills$/, '.project')
  const project = useFormFields(([fields]) => fields[projectPath]?.value)
  const projectId = typeof project === 'number' || typeof project === 'string' ? String(project) : ''
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selected = normalizeHeroPills(value)
  const readOnly = Boolean(props.readOnly || disabled)

  useEffect(() => {
    const controller = new AbortController()
    setSuggestions([])
    setError('')
    setLoading(Boolean(projectId))
    if (projectId) {
      void fetch(`/api/projects/${encodeURIComponent(projectId)}?depth=2`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      }).then(async response => {
        if (!response.ok) throw new Error('Suggestions could not load. You can still type custom pills.')
        const data = await response.json()
        if (!controller.signal.aborted) setSuggestions(getHeroProjectPills(data))
      }).catch(() => {
        if (!controller.signal.aborted) setError('Suggestions could not load. You can still type custom pills.')
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    }
    return () => controller.abort()
  }, [projectId])

  return (
    <div className="hero-slide-pills-field">
      <TextField {...props} />
      {loading ? <p role="status">Loading suggestions…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {suggestions.length ? (
        <div className="hero-slide-pills-field__suggestions" role="group" aria-label="Suggested pills">
          <span>From this project and client:</span>
          <div className="hero-slide-pills-field__options">
            {suggestions.map(label => {
              const active = selected.some(value => value.toLowerCase() === label.toLowerCase())
              return (
                <Button key={label} type="button" size="xsmall" buttonStyle={active ? 'primary' : 'secondary'}
                  disabled={readOnly} extraButtonProps={{ 'aria-pressed': active }}
                  onClick={() => setValue(active
                    ? selected.filter(value => value.toLowerCase() !== label.toLowerCase())
                    : [...selected, label])}>
                  {label}
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
