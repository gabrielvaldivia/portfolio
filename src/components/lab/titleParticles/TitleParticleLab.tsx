'use client'

import { useState } from 'react'

import { EFFECTS } from './effects'
import type { EffectDef } from './engine'
import { LETTER_EFFECTS } from './letterEffects'
import { ParticleTitle, useReducedMotion } from './ParticleTitle'

function EffectGroup({ label, effects, start, title, enabled }: {
  label: string
  effects: EffectDef[]
  start: number
  title: string
  enabled: boolean
}) {
  return (
    <div className="pb-32">
      <p className="mb-14 border-b border-border pb-3 text-[14px] text-text-subtle">{label}</p>
      <div className="flex flex-col gap-24">
        {effects.map((effect, i) => (
          <section key={effect.id} aria-labelledby={`effect-${effect.id}`}>
            <div className="flex items-baseline gap-3 pb-3 text-[14px]">
              <span className="font-mono text-text-subtle">{String(start + i).padStart(2, '0')}</span>
              <span id={`effect-${effect.id}`} className="text-text-strong">{effect.name}</span>
              <span className="hidden text-text-subtle tablet:inline">{effect.description}</span>
            </div>
            <ParticleTitle effect={effect} title={title} enabled={enabled} />
          </section>
        ))}
      </div>
    </div>
  )
}

export function TitleParticleLab({ titles }: { titles: string[] }) {
  const reduced = useReducedMotion()
  const [forceMotion, setForceMotion] = useState(false)
  const [title, setTitle] = useState(titles[0] || 'Selected work')
  const enabled = !reduced || forceMotion

  return (
    <div className="overflow-x-clip">
      <div className="max-w-[1400px] mx-auto px-5 tablet:px-10">
        <header className="flex flex-col gap-5 pb-16 tablet:flex-row tablet:items-end tablet:justify-between">
          <div className="max-w-[640px]">
            <p className="pb-2 text-[14px] text-text-subtle">Lab · not linked anywhere</p>
            <h1 className="text-[34px]">Work title particles</h1>
            <p className="pt-3 text-[16px] leading-[1.45] text-text-muted">
              Hover effects for the title on individual work pages. Each one uses the real title type at its real size.
              Hover a title to try it. Round 2 keeps to subtle effects that reshape the letters themselves.
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-[14px] text-text-subtle">
            Title
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-full bg-background-alt px-4 py-2 text-[15px] text-text-strong"
            >
              {titles.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </header>

        {reduced && (
          <div className="mb-16 flex flex-wrap items-center gap-3 rounded-2xl bg-background-alt px-5 py-4 text-[15px] text-text-muted">
            <span>Reduced motion is on, so the effects are paused.</span>
            <button
              type="button"
              onClick={() => setForceMotion((v) => !v)}
              className="rounded-full bg-background-alt px-3 py-1 text-text-strong"
            >
              {forceMotion ? 'Pause effects' : 'Play them anyway'}
            </button>
          </div>
        )}

        <EffectGroup label="Round 2 · Letters, subtle" effects={LETTER_EFFECTS} start={11} title={title} enabled={enabled} />
        <EffectGroup label="Round 1 · Particles" effects={EFFECTS} start={1} title={title} enabled={enabled} />
      </div>
    </div>
  )
}
