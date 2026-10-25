import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'
import { People } from './collections/People'
import { Clients } from './collections/Clients'
import { Services } from './collections/Services'
import { SideProjects } from './collections/SideProjects'
import { Pages } from './collections/Pages'
import { Conversations } from './collections/Conversations'
import { Photos } from './collections/Photos'
import { Notes } from './collections/Notes'
import { NoteSubscribers } from './collections/NoteSubscribers'

import { SiteSettings } from './globals/SiteSettings'
import { Timeline } from './globals/Timeline'
import { getPayloadSecret } from './lib/payloadSecret'
import { withContentRevalidation, withGlobalRevalidation } from './lib/contentRevalidation'
import { withCmsUserAccess, withGlobalCmsUserAccess } from './lib/cmsAccess'
import { portfolioMcpTools } from './lib/portfolioMcpTools'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const rawDatabaseURI = process.env.DATABASE_URI || process.env.DATABASE_URL || ''
const databaseURI = (() => {
  if (!rawDatabaseURI) return rawDatabaseURI
  try {
    const url = new URL(rawDatabaseURI)
    if (process.env.DATABASE_POOLER_PORT) {
      url.port = process.env.DATABASE_POOLER_PORT
    } else if (url.hostname.includes('pooler.supabase.com') && url.port === '5432') {
      url.port = '6543'
    }
    return url.toString()
  } catch {
    return rawDatabaseURI
  }
})()
const databasePoolMax = Number(process.env.DATABASE_POOL_MAX || 3)
const canonicalProductionURL = 'https://www.gabrielvaldivia.com'
const serverURL = (
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.PAYLOAD_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_ENV === 'production' ? canonicalProductionURL : '') ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
).replace(/\/+$/, '')
const cleanEnv = (value?: string) => (value || '').replace(/\\n/g, '').replace(/[\r\n]/g, '').trim()
const r2Bucket = cleanEnv(process.env.R2_BUCKET)
const r2Endpoint = cleanEnv(process.env.R2_ENDPOINT)
const r2AccessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID)
const r2SecretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY)
const r2PublicURL = cleanEnv(process.env.R2_PUBLIC_URL).replace(/\/+$/, '')
const hasR2Storage = Boolean(r2Bucket && r2Endpoint && r2AccessKeyId && r2SecretAccessKey && r2PublicURL)

const normalizeOrigin = (value?: string) => {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

const payloadAllowedOrigins = Array.from(
  new Set(
    [
      normalizeOrigin(serverURL),
      normalizeOrigin(process.env.NEXT_PUBLIC_SERVER_URL),
      normalizeOrigin(process.env.PAYLOAD_PUBLIC_SERVER_URL),
      normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
      normalizeOrigin(
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : undefined,
      ),
      normalizeOrigin(process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined),
      'https://gabrielvaldivia.com',
      canonicalProductionURL,
    ].filter((origin): origin is string => Boolean(origin)),
  ),
)

const joinURLParts = (...parts: Array<string | undefined>) =>
  parts
    .filter((part): part is string => Boolean(part))
    .map((part, index) => (index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')))
    .filter(Boolean)
    .join('/')

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    components: {
      afterNav: ['./components/admin/SidebarAccount#SidebarAccount'],
      beforeNavLinks: ['./components/admin/DashboardSidebarNav#DashboardSidebarNav'],
      graphics: {
        Icon: './components/admin/Hugeicons#AdminBrandIcon',
        Logo: './components/admin/Hugeicons#AdminBrandLogo',
      },
      providers: ['./components/admin/AdminCreateHeaderProvider#AdminCreateHeaderProvider'],
      views: {
        dashboard: {
          Component: './components/admin/RecentDashboard#RecentDashboard',
          meta: {
            title: 'Recent',
          },
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Pages, Notes, NoteSubscribers, Projects, SideProjects, Clients, People, Services, Conversations, Photos, Users, Media].map((collection) => withContentRevalidation(withCmsUserAccess(collection))),
  globals: [SiteSettings, Timeline].map((global) => withGlobalRevalidation(withGlobalCmsUserAccess(global))),
  editor: lexicalEditor(),
  secret: getPayloadSecret(),
  cors: {
    headers: ['Content-Length'],
    origins: payloadAllowedOrigins,
  },
  csrf: payloadAllowedOrigins,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseURI,
      max: databasePoolMax,
    },
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [
    mcpPlugin({
      collections: {
        pages: {
          enabled: true,
          description: 'Portfolio pages and their page-builder sections.',
        },
        notes: {
          enabled: { find: true, create: false, update: false, delete: false },
          description:
            'Portfolio notes. Use createNoteDraft, updateNoteDraft, scheduleNote, and publishNote for safe draft and publishing workflows.',
        },
        projects: {
          enabled: true,
          description: 'Featured portfolio projects and their rich content blocks.',
        },
        'side-projects': {
          enabled: true,
          description: 'Side projects and their rich content blocks.',
        },
        clients: {
          enabled: true,
          description: 'Client profiles and related portfolio metadata.',
        },
        people: {
          enabled: true,
          description: 'People, collaborators, and testimonials.',
        },
        services: {
          enabled: true,
          description: 'Portfolio capabilities and service labels.',
        },
        photos: {
          enabled: { find: true, create: false, update: true, delete: false },
          description: 'Portfolio photo gallery entries. Use uploadPortfolioAsset to add a photo file.',
        },
        media: {
          enabled: { find: true, create: false, update: true, delete: false },
          description: 'Images and videos used by portfolio content. Use uploadPortfolioAsset to add a file.',
        },
      },
      globals: {
        'site-settings': {
          enabled: true,
          description: 'Site identity, SEO defaults, icons, and scheduled overlay settings.',
        },
        timeline: {
          enabled: true,
          description: 'Timeline chapter titles and narrative content.',
        },
      },
      overrideApiKeyCollection: (collection) => {
        for (const field of collection.fields) {
          if (field.type !== 'collapsible') continue
          for (const group of field.fields) {
            if (
              !('name' in group) ||
              group.name !== 'payload-mcp-tool' ||
              !('fields' in group)
            ) continue
            group.fields = group.fields.map((toolField) =>
              toolField.type === 'checkbox' ? { ...toolField, defaultValue: false } : toolField,
            )
          }
        }
        return collection
      },
      mcp: {
        serverOptions: {
          serverInfo: { name: 'Gabriel Valdivia Portfolio', version: '1.0.0' },
          instructions:
            'Manage portfolio content through Payload. Keep notes as drafts unless explicitly asked to publish or schedule; first-time publication can queue its newsletter. Create media and photo uploads with uploadPortfolioAsset, then link the returned document ID in content.',
        },
        tools: portfolioMcpTools,
      },
    }),
    ...(hasR2Storage
      ? [
          s3Storage({
            clientUploads: true,
            collections: {
              media: {
                disablePayloadAccessControl: true,
                generateFileURL: ({ filename, prefix }) => joinURLParts(r2PublicURL, prefix, filename),
              },
              photos: {
                prefix: 'photos',
                disablePayloadAccessControl: true,
                generateFileURL: ({ filename, prefix }) => joinURLParts(r2PublicURL, prefix, filename),
              },
            },
            bucket: r2Bucket,
            config: {
              endpoint: r2Endpoint,
              forcePathStyle: true,
              credentials: {
                accessKeyId: r2AccessKeyId,
                secretAccessKey: r2SecretAccessKey,
              },
              region: 'auto',
            },
          }),
        ]
      : []),
  ],
})
