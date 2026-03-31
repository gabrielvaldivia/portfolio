'use client'

import { useState } from 'react'
import { ServicePill } from '@/components/ServicePill'
import { Avatar } from '@/components/Avatar'
import { Testimonial } from '@/components/Testimonial'
import { FAQ } from '@/components/FAQ'
import { ProjectCard } from '@/components/ProjectCard'
import { SocialIcon, HoverChevron } from '@/components/Icons'

const faqItems = [
  { question: 'Example question one?', answer: 'This is an example answer to demonstrate the FAQ accordion component.' },
  { question: 'Example question two?', answer: 'Another example answer showing how the accordion expands and collapses.' },
]

function ColorSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`w-full aspect-square rounded-xl border border-border ${className}`} />
      <span className="text-[13px] text-muted">{name}</span>
    </div>
  )
}

const sections = [
  'Colors',
  'Typography',
  'Spacing',
  'Pills',
  'Avatars',
  'Testimonial',
  'FAQ',
  'Project Card',
  'Image Blocks',
  'Layout',
  'Social Icons',
  'Links',
  'Marquee',
]

export default function DesignSystemPage() {
  const [active, setActive] = useState('Colors')

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-[220px] shrink-0 border-r border-border p-6 pt-10 sticky top-0 h-screen overflow-y-auto hidden tablet:block">
        <h6 className="text-muted">Design System</h6>
        <div className="h-5" />
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setActive(section)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-[14px] transition-colors ${
                active === section ? 'bg-background-alt text-content font-medium' : 'text-muted hover:text-content'
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile select */}
      <div className="tablet:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b border-border p-4">
        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="w-full bg-background-alt border border-border rounded-lg px-3 py-2 text-[14px]"
        >
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 tablet:p-10 pt-20 tablet:pt-10">
        <h2 className="pb-10">{active}</h2>

        {active === 'Colors' && (
          <div className="space-y-10">
            <div className="grid grid-cols-3 tablet:grid-cols-5 desktop:grid-cols-10 gap-4">
              <ColorSwatch name="Content" className="bg-content" />
              <ColorSwatch name="Muted" className="bg-muted" />
              <ColorSwatch name="Background" className="bg-background" />
              <ColorSwatch name="Bg Alt" className="bg-background-alt" />
              <ColorSwatch name="Bg Alt Hover" className="bg-alt-hover" />
              <ColorSwatch name="Border" className="bg-border" />
              <ColorSwatch name="Border Strong" className="bg-border-strong" />
              <ColorSwatch name="Elevated" className="bg-elevated" />
              <ColorSwatch name="Floating" className="bg-floating" />
              <ColorSwatch name="Accent" className="bg-accent" />
              <ColorSwatch name="Inverse" className="bg-inverse" />
            </div>
          </div>
        )}

        {active === 'Typography' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 1</span>
              <h1>The quick brown fox</h1>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 2</span>
              <h2>The quick brown fox jumps over</h2>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 3</span>
              <h3>The quick brown fox jumps over the lazy dog</h3>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 4</span>
              <h4>The quick brown fox jumps over the lazy dog</h4>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 5</span>
              <h5>The quick brown fox jumps over the lazy dog</h5>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 6 — Mono, Uppercase</span>
              <h6>The quick brown fox</h6>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Body</span>
              <p className="text-body">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Body Large</span>
              <p className="text-body-large">The quick brown fox jumps over the lazy dog.</p>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Body XL</span>
              <p className="text-body-xl">The quick brown fox jumps over.</p>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Caption</span>
              <p className="text-caption">The quick brown fox jumps over the lazy dog.</p>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Muted</span>
              <p className="text-muted">The quick brown fox jumps over the lazy dog.</p>
            </div>
          </div>
        )}

        {active === 'Spacing' && (
          <div className="space-y-6">
            {[
              ['XS — 10px', 'w-[10px]'],
              ['S — 20px', 'w-[20px]'],
              ['M — 40px', 'w-[40px]'],
              ['L — 60px', 'w-[60px]'],
              ['XL — 80px', 'w-[80px]'],
              ['Row Height — 200px', 'w-[200px]'],
            ].map(([label, width]) => (
              <div key={label} className="flex items-center gap-4">
                <span className="text-muted text-[13px] w-32">{label}</span>
                <div className={`h-3 bg-content opacity-20 rounded ${width}`} />
              </div>
            ))}
          </div>
        )}

        {active === 'Pills' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Large (Homepage)</span>
              <div className="flex flex-wrap gap-3">
                <ServicePill title="Product Design" />
                <ServicePill title="Branding" />
                <ServicePill title="Strategy" />
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Small (Case Study)</span>
              <div className="flex flex-wrap gap-2">
                <ServicePill title="Product Design" size="small" />
                <ServicePill title="Branding" size="small" />
                <ServicePill title="Strategy" size="small" />
              </div>
            </div>
          </div>
        )}

        {active === 'Avatars' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Initials fallback</span>
              <div className="flex gap-2">
                <Avatar name="Jane Doe" role="Designer" />
                <Avatar name="John Smith" role="Engineer" />
                <Avatar name="Alex Kim" role="PM" />
              </div>
            </div>
          </div>
        )}

        {active === 'Testimonial' && (
          <div className="max-w-[480px]">
            <Testimonial
              quote="This is an example testimonial showing the card component with a quote, author name, and company."
              name="Jane Doe"
              company="Acme Inc"
              linkedIn="https://linkedin.com"
            />
          </div>
        )}

        {active === 'FAQ' && (
          <div className="max-w-[700px]">
            <FAQ items={faqItems} />
          </div>
        )}

        {active === 'Project Card' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Standard</span>
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
                <ProjectCard title="Project Name" slug="#" subtitle="A short project description" />
                <ProjectCard title="Another Project" slug="#" subtitle="Another description here" />
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">With Icon (Index Card)</span>
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
                <ProjectCard title="Index" slug="" subtitle="View all projects" href="/work" icon={
                  <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none"><path d="M21 31C15.477 31 11 35.477 11 41V159C11 164.523 15.477 169 21 169H179C184.523 169 189 164.523 189 159V61.361C189 55.838 184.523 51.361 179 51.361H84.081C83.022 51.361 82.006 50.94 81.256 50.192L64.947 33.921C63.072 32.05 60.532 31 57.884 31H21Z" stroke="currentColor" strokeWidth="2"/></svg>
                } />
              </div>
            </div>
          </div>
        )}

        {active === 'Image Blocks' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Full Width (bg-alt)</span>
              <div className="bg-background-alt overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex items-center justify-center text-muted">16:9</div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">With padding</span>
              <div className="bg-background-alt p-5 tablet:p-8 desktop:p-10">
                <div className="overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
                  <div className="absolute inset-0 flex items-center justify-center text-muted border border-border rounded-lg">padded</div>
                </div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">2-Column Grid</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background-alt overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
                  <div className="absolute inset-0 flex items-center justify-center text-muted">4:3</div>
                </div>
                <div className="bg-background-alt overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
                  <div className="absolute inset-0 flex items-center justify-center text-muted">4:3</div>
                </div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">With border</span>
              <div className="bg-background-alt overflow-hidden relative border border-border" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex items-center justify-center text-muted">bordered</div>
              </div>
            </div>
          </div>
        )}

        {active === 'Layout' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">6-Column Grid</span>
              <div className="grid grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(n => (
                  <div key={n} className="bg-background-alt rounded-xl p-4 text-center text-muted text-sm">{n}</div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Row Height (200px)</span>
              <div className="grid grid-cols-3 gap-4" style={{ gridAutoRows: '200px' }}>
                <div className="bg-background-alt rounded-xl p-4 text-center text-muted text-sm row-span-2">2 rows</div>
                <div className="bg-background-alt rounded-xl p-4 text-center text-muted text-sm">1 row</div>
                <div className="bg-background-alt rounded-xl p-4 text-center text-muted text-sm">1 row</div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Meta Row (100px label + content)</span>
              <div className="flex gap-10 items-start">
                <h6 className="w-[100px] shrink-0 pt-1 text-muted">Label</h6>
                <p>Content goes here next to the label</p>
              </div>
            </div>
          </div>
        )}

        {active === 'Social Icons' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Social Icons</span>
              <div className="flex gap-6 items-center">
                <div className="flex items-center gap-2"><SocialIcon platform="Twitter" /> Twitter</div>
                <div className="flex items-center gap-2"><SocialIcon platform="LinkedIn" /> LinkedIn</div>
                <div className="flex items-center gap-2"><SocialIcon platform="Instagram" /> Instagram</div>
                <div className="flex items-center gap-2"><SocialIcon platform="Substack" /> Substack</div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Hover Chevron</span>
              <div className="group inline-flex items-center gap-2 cursor-pointer">
                <span>Hover me</span>
                <HoverChevron />
              </div>
            </div>
          </div>
        )}

        {active === 'Links' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Learn more link</span>
              <a href="#" className="text-muted hover:opacity-50 transition-opacity inline-flex items-center gap-1">
                Learn more
                <svg className="shrink-0 translate-y-[2px]" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
              </a>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Rich text link</span>
              <div className="rich-text">
                <p>This is a paragraph with an <a href="#">inline link</a> inside rich text content.</p>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Nav pill (inactive)</span>
              <span className="bg-floating backdrop-blur-[40px] rounded-full px-5 py-2.5 text-[15px]">Label</span>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Nav pill (active)</span>
              <span className="bg-content rounded-full px-5 py-2.5 text-[15px]" style={{ color: 'var(--color-nav-active-text)' }}>Label</span>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Close button</span>
              <button className="bg-floating hover:bg-hover transition-colors rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-[40px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}

        {active === 'Marquee' && (
          <div className="overflow-hidden">
            <div className="marquee">
              <div className="marquee-track">
                {[...Array(8)].map((_, i) => (
                  <span key={i} className="text-content opacity-30 text-[30px] tablet:text-[48px] font-heading whitespace-nowrap">
                    Client Name
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
