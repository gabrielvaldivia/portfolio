import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
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

import { SiteSettings } from './globals/SiteSettings'
import { getPayloadSecret } from './lib/payloadSecret'

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
const r2Bucket = process.env.R2_BUCKET || ''
const r2Endpoint = process.env.R2_ENDPOINT || ''
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || ''
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''
const r2PublicURL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
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
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Pages, Projects, SideProjects, Clients, People, Services, Conversations, Users, Media],
  globals: [SiteSettings],
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
    ...(hasR2Storage
      ? [
          s3Storage({
            clientUploads: true,
            collections: {
              media: {
                disablePayloadAccessControl: true,
                generateFileURL: ({ filename, prefix }) => joinURLParts(r2PublicURL, prefix, filename),
              },
            },
            bucket: r2Bucket,
            config: {
              endpoint: r2Endpoint,
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
