'use client'

import { useState } from 'react'
import { ServicePill } from '@/components/ServicePill'
import { Avatar } from '@/components/Avatar'
import { Testimonial } from '@/components/Testimonial'
import { FAQ } from '@/components/FAQ'
import { ProjectCard } from '@/components/ProjectCard'
import { IndexCard } from '@/components/IndexCard'

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
  'Index Card',
  'Image Blocks',
  'Layout',
  'Approach Item',
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
          <div className="grid grid-cols-3 tablet:grid-cols-5 desktop:grid-cols-10 gap-4">
            <ColorSwatch name="Content" className="bg-content" />
            <ColorSwatch name="Muted" className="bg-muted" />
            <ColorSwatch name="Background" className="bg-background" />
            <ColorSwatch name="Bg Alt" className="bg-background-alt" />
            <ColorSwatch name="Border" className="bg-border" />
            <ColorSwatch name="Border Strong" className="bg-border-strong" />
            <ColorSwatch name="Elevated" className="bg-elevated" />
            <ColorSwatch name="Floating" className="bg-floating" />
            <ColorSwatch name="Accent" className="bg-accent" />
            <ColorSwatch name="Inverse" className="bg-inverse" />
          </div>
        )}

        {active === 'Typography' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 1 — 34 / 60 / 100px</span>
              <h1>The quick brown fox</h1>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 2 — 28 / 36 / 48px</span>
              <h2>The quick brown fox jumps over</h2>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Heading 3 — 22 / 26 / 30px</span>
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
              <span className="text-muted text-[13px] block mb-2">Body — 16 / 18 / 20px</span>
              <p>The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-2">Body Large — 18 / 22 / 26px</span>
              <p className="text-[18px] tablet:text-[22px] desktop:text-[26px] leading-[1.4]">The quick brown fox jumps over the lazy dog.</p>
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
              ['10px', 'w-[10px]'],
              ['20px', 'w-[20px]'],
              ['40px', 'w-[40px]'],
              ['80px', 'w-[80px]'],
              ['112px', 'w-[112px]'],
              ['160px', 'w-[160px]'],
              ['200px', 'w-[200px]'],
            ].map(([label, width]) => (
              <div key={label} className="flex items-center gap-4">
                <span className="text-muted text-[13px] w-16">{label}</span>
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
              <span className="text-muted text-[13px] block mb-4">With photo</span>
              <div className="flex gap-2">
                <Avatar name="Jane Doe" photo={{ url: '/api/media/file/about-photo-300x298.png', alt: 'Jane' }} role="Designer" linkedIn="https://linkedin.com" />
                <Avatar name="John Smith" photo={{ url: '/api/media/file/about-photo-300x298.png', alt: 'John' }} role="Engineer" />
              </div>
            </div>
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
              quote="This is an example testimonial showing the card component with a quote, author name, role, and company."
              name="Jane Doe"
              role="Head of Design"
              company="Acme Inc"
              photo={{ url: '/api/media/file/about-photo-300x298.png', alt: 'Jane' }}
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
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
            <ProjectCard title="Project Name" slug="#" subtitle="A short project description" />
            <ProjectCard title="Another Project" slug="#" subtitle="Another description here" />
          </div>
        )}

        {active === 'Index Card' && (
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
            <IndexCard title="Project Name" slug="#" subtitle="A short description" />
            <IndexCard title="Another Project" slug="#" subtitle="Another description" />
            <IndexCard title="Third Project" slug="#" subtitle="Third description" />
          </div>
        )}

        {active === 'Image Blocks' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Full Width (bg-alt, object-cover)</span>
              <div className="bg-background-alt overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex items-center justify-center text-muted">16:9</div>
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
              <span className="text-muted text-[13px] block mb-4">3-Column Grid (1 + 2 span)</span>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-background-alt rounded-xl p-6 text-center text-muted text-sm">1 col</div>
                <div className="bg-background-alt rounded-xl p-6 text-center text-muted text-sm col-span-2">2 col span</div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">3-Column Grid (equal)</span>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-background-alt rounded-xl p-6 text-center text-muted text-sm">1</div>
                <div className="bg-background-alt rounded-xl p-6 text-center text-muted text-sm">2</div>
                <div className="bg-background-alt rounded-xl p-6 text-center text-muted text-sm">3</div>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Meta Row (100px label + content)</span>
              <div className="flex gap-10 items-start">
                <h6 className="w-[100px] shrink-0 pt-1">Label</h6>
                <p>Content goes here next to the label</p>
              </div>
            </div>
          </div>
        )}

        {active === 'Approach Item' && (
          <div className="grid grid-cols-1 desktop:grid-cols-3 gap-10">
            <div className="flex gap-5 items-start">
              <span className="text-content opacity-50 text-[20px] shrink-0">01</span>
              <p className="text-[20px] leading-[1.4]">Example approach item showing numbered grid layout.</p>
            </div>
            <div className="flex gap-5 items-start">
              <span className="text-content opacity-50 text-[20px] shrink-0">02</span>
              <p className="text-[20px] leading-[1.4]">Another approach item with different content.</p>
            </div>
            <div className="flex gap-5 items-start">
              <span className="text-content opacity-50 text-[20px] shrink-0">03</span>
              <p className="text-[20px] leading-[1.4]">Third item completing the row.</p>
            </div>
          </div>
        )}

        {active === 'Links' && (
          <div className="space-y-10">
            <div>
              <span className="text-muted text-[13px] block mb-4">Default link</span>
              <a href="#" className="text-muted hover:text-content transition-colors">View all projects</a>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Rich text link</span>
              <div className="rich-text">
                <p>This is a paragraph with an <a href="#">inline link</a> inside rich text content.</p>
              </div>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Nav pill (inactive)</span>
              <span className="bg-floating rounded-full px-5 py-2.5 text-[15px]">Label</span>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Nav pill (active)</span>
              <span className="bg-content rounded-full px-5 py-2.5 text-[15px]" style={{ color: 'var(--color-nav-active-text)' }}>Label</span>
            </div>
            <div>
              <span className="text-muted text-[13px] block mb-4">Social link</span>
              <a href="#" className="text-muted hover:text-content transition-colors text-[20px]">Twitter</a>
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
