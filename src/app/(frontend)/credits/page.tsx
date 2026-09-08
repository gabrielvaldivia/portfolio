import type { Metadata } from 'next'

import { CreditsPlaybackControl } from '@/components/CreditsPlaybackControl'
import { cn } from '@/lib/cn'

type Credit = {
  role: string
  name: string
  href?: string
  packageName?: string
}

type NamedCredit = {
  name: string
  href?: string
}

type CreditSection =
  | {
      title: string
      credits: Credit[]
      names?: never
    }
  | {
      title: string
      names: NamedCredit[]
      nameLayout?: 'horizontal' | 'vertical'
      credits?: never
    }

const creditSections: CreditSection[] = [
  {
    title: 'Cast',
    credits: [
      {
        role: 'Design & content',
        name: 'Gabriel Valdivia',
        href: 'https://www.gabrielvaldivia.com',
      },
      {
        role: 'Lead development',
        name: 'Codex',
        href: 'https://openai.com/codex/',
      },
      {
        role: 'Development assistance',
        name: 'Claude',
        href: 'https://www.anthropic.com/claude',
      },
      {
        role: 'Application framework',
        name: 'Next.js',
        href: 'https://github.com/vercel/next.js',
        packageName: 'next',
      },
      {
        role: 'Interface library',
        name: 'React',
        href: 'https://github.com/facebook/react',
        packageName: 'react',
      },
      {
        role: 'DOM renderer',
        name: 'React DOM',
        href: 'https://github.com/facebook/react',
        packageName: 'react-dom',
      },
      {
        role: 'Content management',
        name: 'Payload CMS',
        href: 'https://github.com/payloadcms/payload',
        packageName: 'payload',
      },
      {
        role: 'Styling',
        name: 'Tailwind CSS',
        href: 'https://github.com/tailwindlabs/tailwindcss',
        packageName: 'tailwindcss',
      },
      {
        role: 'Language',
        name: 'TypeScript',
        href: 'https://github.com/microsoft/TypeScript',
        packageName: 'typescript',
      },
      {
        role: 'Runtime',
        name: 'Node.js',
        href: 'https://github.com/nodejs/node',
      },
    ],
  },
  {
    title: 'Infrastructure',
    credits: [
      {
        role: 'Hosting & deployment',
        name: 'Vercel',
        href: 'https://vercel.com',
      },
      {
        role: 'Database engine',
        name: 'PostgreSQL',
        href: 'https://www.postgresql.org',
      },
      {
        role: 'Database hosting',
        name: 'Neon',
        href: 'https://neon.com',
      },
      {
        role: 'Media storage',
        name: 'Cloudflare R2',
        href: 'https://developers.cloudflare.com/r2/',
      },
      {
        role: 'AI inference',
        name: 'Cloudflare Workers AI',
        href: 'https://developers.cloudflare.com/workers-ai/',
      },
      {
        role: 'Chat',
        name: 'Meta Llama 3.1 8B Instruct Fast',
        href: 'https://github.com/meta-llama/llama-models',
      },
      {
        role: 'Maps',
        name: 'Mapbox',
        href: 'https://www.mapbox.com',
        packageName: 'mapbox-gl',
      },
      {
        role: 'Email delivery',
        name: 'Resend',
        href: 'https://github.com/resend/resend-node',
        packageName: 'resend',
      },
      {
        role: 'Analytics',
        name: 'Google Analytics',
        href: 'https://analytics.google.com',
      },
      {
        role: 'Location lookup',
        name: 'ipapi',
        href: 'https://ipapi.co',
      },
      {
        role: 'Second brain',
        name: 'Patina',
        href: 'https://patina.md',
      },
    ],
  },
  {
    title: 'Typography',
    credits: [
      {
        role: 'Headings',
        name: 'Inter Display',
        href: 'https://github.com/rsms/inter',
      },
      {
        role: 'Body copy',
        name: 'Inter',
        href: 'https://github.com/rsms/inter',
      },
      {
        role: 'Utility text',
        name: 'SF Mono',
        href: 'https://developer.apple.com/fonts/',
      },
    ],
  },
  {
    title: 'Interface & motion',
    credits: [
      {
        role: 'Icon library',
        name: 'Hugeicons',
        href: 'https://github.com/hugeicons/hugeicons',
        packageName: '@hugeicons/core-free-icons · @hugeicons/react',
      },
      {
        role: 'Additional icons',
        name: 'Lucide',
        href: 'https://github.com/lucide-icons/lucide',
        packageName: 'lucide-react',
      },
      {
        role: 'Dialogs',
        name: 'Radix UI Dialog',
        href: 'https://github.com/radix-ui/primitives',
        packageName: '@radix-ui/react-dialog',
      },
      {
        role: 'Popovers',
        name: 'Radix UI Popover',
        href: 'https://github.com/radix-ui/primitives',
        packageName: '@radix-ui/react-popover',
      },
      {
        role: 'Switches',
        name: 'Radix UI Switch',
        href: 'https://github.com/radix-ui/primitives',
        packageName: '@radix-ui/react-switch',
      },
      {
        role: 'Date picker',
        name: 'React DayPicker',
        href: 'https://github.com/gpbl/react-day-picker',
        packageName: 'react-day-picker',
      },
      {
        role: 'Motion',
        name: 'Motion',
        href: 'https://github.com/motiondivision/motion',
        packageName: 'motion',
      },
      {
        role: 'Text highlights',
        name: 'Highlighters',
        href: 'https://github.com/JaceThings/highlighters',
        packageName: '@highlighters/core',
      },
    ],
  },
  {
    title: 'Content, maps & media',
    credits: [
      {
        role: 'Rich-text foundation',
        name: 'Lexical',
        href: 'https://github.com/facebook/lexical',
        packageName: 'lexical',
      },
      {
        role: 'Image processing',
        name: 'Sharp',
        href: 'https://github.com/lovell/sharp',
        packageName: 'sharp',
      },
      {
        role: 'Photo metadata',
        name: 'EXIF Reader',
        href: 'https://github.com/devongovett/exif-reader',
        packageName: 'exif-reader',
      },
      {
        role: 'Dates',
        name: 'date-fns',
        href: 'https://github.com/date-fns/date-fns',
        packageName: 'date-fns',
      },
      {
        role: 'Time zones',
        name: 'tz-lookup',
        href: 'https://github.com/darkskyapp/tz-lookup',
        packageName: 'tz-lookup',
      },
      {
        role: 'API schema',
        name: 'GraphQL.js',
        href: 'https://github.com/graphql/graphql-js',
        packageName: 'graphql',
      },
      {
        role: 'Spherical geometry',
        name: 'D3 Geo',
        href: 'https://github.com/d3/d3-geo',
        packageName: 'd3-geo',
      },
      {
        role: 'Geographic data tools',
        name: 'TopoJSON Client',
        href: 'https://github.com/topojson/topojson-client',
        packageName: 'topojson-client',
      },
      {
        role: 'World map package',
        name: 'World Atlas',
        href: 'https://github.com/topojson/world-atlas',
        packageName: 'world-atlas',
      },
      {
        role: 'World map source data',
        name: 'Natural Earth',
        href: 'https://www.naturalearthdata.com',
      },
      {
        role: 'Geographic data types',
        name: 'TopoJSON Specification types',
        href: 'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/topojson-specification',
        packageName: 'topojson-specification · @types/topojson-specification',
      },
      {
        role: 'Country flag artwork',
        name: 'Flags Icons Pro',
        href: 'https://creativemarket.com/lucchaissac/482595-Flags-Icons-Pro-Sketch-File',
      },
      {
        role: 'Photo ring',
        name: 'OpenFeed',
        href: 'https://openfeed.photo',
      },
      {
        role: 'End credits music',
        name: 'Exit Music (For a Film), Epic Orchestra',
      },
      {
        role: 'Photo feed format',
        name: 'JSON Feed 1.1',
        href: 'https://www.jsonfeed.org/version/1.1/',
      },
      {
        role: 'Notes feed format',
        name: 'RSS 2.0',
        href: 'https://www.rssboard.org/rss-specification',
      },
    ],
  },
  {
    title: 'Payload ensemble',
    credits: [
      {
        role: 'Postgres adapter',
        name: 'Payload Postgres',
        href: 'https://github.com/payloadcms/payload',
        packageName: '@payloadcms/db-postgres',
      },
      {
        role: 'Next.js integration',
        name: 'Payload for Next.js',
        href: 'https://github.com/payloadcms/payload',
        packageName: '@payloadcms/next',
      },
      {
        role: 'Rich-text integration',
        name: 'Payload Lexical',
        href: 'https://github.com/payloadcms/payload',
        packageName: '@payloadcms/richtext-lexical',
      },
      {
        role: 'Object storage adapter',
        name: 'Payload S3 Storage',
        href: 'https://github.com/payloadcms/payload',
        packageName: '@payloadcms/storage-s3',
      },
      {
        role: 'Admin interface',
        name: 'Payload UI',
        href: 'https://github.com/payloadcms/payload',
        packageName: '@payloadcms/ui',
      },
      {
        role: 'Admin translations',
        name: 'Payload Translations',
        href: 'https://github.com/payloadcms/payload',
        packageName: '@payloadcms/translations',
      },
      {
        role: 'Query strings',
        name: 'qs-esm',
        href: 'https://github.com/payloadcms/qs-esm',
        packageName: 'qs-esm',
      },
      {
        role: 'Admin notifications',
        name: 'Sonner',
        href: 'https://github.com/emilkowalski/sonner',
        packageName: 'sonner',
      },
    ],
  },
  {
    title: 'Production crew',
    credits: [
      {
        role: 'CSS processing',
        name: 'PostCSS',
        href: 'https://github.com/postcss/postcss',
        packageName: 'postcss',
      },
      {
        role: 'Tailwind processing',
        name: 'Tailwind CSS PostCSS plugin',
        href: 'https://github.com/tailwindlabs/tailwindcss',
        packageName: '@tailwindcss/postcss',
      },
      {
        role: 'Admin styles',
        name: 'Dart Sass',
        href: 'https://github.com/sass/dart-sass',
        packageName: 'sass',
      },
      {
        role: 'TypeScript scripts',
        name: 'tsx',
        href: 'https://github.com/privatenumber/tsx',
        packageName: 'tsx',
      },
      {
        role: 'Environment configuration',
        name: 'dotenv',
        href: 'https://github.com/motdotla/dotenv',
        packageName: 'dotenv',
      },
      {
        role: 'Test database',
        name: 'PGlite',
        href: 'https://github.com/electric-sql/pglite',
        packageName: '@electric-sql/pglite',
      },
      {
        role: 'SQL test tooling',
        name: 'Drizzle ORM',
        href: 'https://github.com/drizzle-team/drizzle-orm',
        packageName: 'drizzle-orm',
      },
      {
        role: 'Browser-test bundling',
        name: 'esbuild',
        href: 'https://github.com/evanw/esbuild',
        packageName: 'esbuild',
      },
      {
        role: 'Browser testing',
        name: 'Playwright',
        href: 'https://github.com/microsoft/playwright',
      },
      {
        role: 'Package management',
        name: 'npm',
        href: 'https://github.com/npm/cli',
      },
      {
        role: 'Version control',
        name: 'Git',
        href: 'https://git-scm.com',
      },
      {
        role: 'Source hosting',
        name: 'GitHub',
        href: 'https://github.com',
      },
      {
        role: 'Large-file history',
        name: 'Git LFS',
        href: 'https://github.com/git-lfs/git-lfs',
      },
      {
        role: 'Storage scripts',
        name: 'AWS SDK for JavaScript',
        href: 'https://github.com/aws/aws-sdk-js-v3',
        packageName: '@aws-sdk/client-s3',
      },
      {
        role: 'Database scripts',
        name: 'node-postgres',
        href: 'https://github.com/brianc/node-postgres',
        packageName: 'pg',
      },
      {
        role: 'Type definitions',
        name: 'DefinitelyTyped',
        href: 'https://github.com/DefinitelyTyped/DefinitelyTyped',
        packageName: '@types/d3-geo · @types/node · @types/react · @types/react-dom · @types/topojson-client',
      },
      {
        role: 'Visual feedback',
        name: 'Agentation',
        href: 'https://agentation.com',
        packageName: 'agentation',
      },
    ],
  },
  {
    title: 'Special thanks',
    names: [
      { name: 'Daniel Chung', href: 'https://danielchung.design/' },
      { name: 'Marimar Cabrero', href: 'https://marimardesign.framer.website/' },
      { name: 'Charlie Deets', href: 'https://charliedeets.com/' },
      { name: 'Brian Lovin', href: 'https://brianlovin.com/' },
      { name: 'Jeff Smith', href: 'https://fieldwork.software/' },
    ],
    nameLayout: 'horizontal',
  },
  {
    title: 'Dedicated to',
    names: [{ name: 'Leah, Goose, and Theo' }],
  },
]

export const metadata: Metadata = {
  title: 'Credits',
  description: 'The people, tools, libraries, typefaces, data, and services behind this website.',
}

function LinkedName({ name, href }: NamedCredit) {
  const content = <span>{name}</span>

  if (!href) return content

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
    >
      {content}
    </a>
  )
}

function CreditName({ credit }: { credit: Credit }) {
  return <LinkedName name={credit.name} href={credit.href} />
}

export default function CreditsPage() {
  return (
    <>
      <main className="px-5 pt-16 pb-32 tablet:px-10 tablet:pt-24 tablet:pb-48">
        <div className="mx-auto flex max-w-3xl flex-col gap-32 tablet:gap-48">
          <div className="flex w-full justify-center px-5 tablet:px-10">
            <h5 className="w-full max-w-xl text-center !font-semibold text-text-body">
              With gratitude to everyone who builds in the open.
            </h5>
          </div>

          <div className="space-y-24 tablet:space-y-32">
            {creditSections.map((section) => {
              const headingId = `credits-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

              return (
                <section key={section.title} aria-labelledby={headingId}>
                  <h2
                    id={headingId}
                    className="text-center !font-mono !text-caption !font-normal uppercase text-text-muted"
                  >
                    {section.title}
                  </h2>
                  {section.names ? (
                    <ul
                      className={cn(
                        'mt-10 text-center tablet:mt-12',
                        section.nameLayout === 'horizontal'
                          ? 'mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-x-8 gap-y-6'
                          : 'space-y-6 tablet:space-y-7',
                      )}
                    >
                      {section.names.map((name) => (
                        <li key={name.name}>
                          <LinkedName name={name.name} href={name.href} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <dl className="mt-10 space-y-6 tablet:mt-12 tablet:space-y-7">
                      {section.credits.map((credit) => (
                        <div
                          key={`${credit.role}:${credit.name}`}
                          className="grid grid-cols-2 items-start gap-5 tablet:gap-10"
                        >
                          <dt className="text-right text-text-muted">
                            {credit.role}
                          </dt>
                          <dd className="min-w-0 text-left">
                            <CreditName credit={credit} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      </main>
      <CreditsPlaybackControl />
    </>
  )
}
