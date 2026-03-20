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

import { SiteSettings } from './globals/SiteSettings'
import { Navigation } from './globals/Navigation'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Pages, People, Clients, Projects, SideProjects, Services, Users, Media],
  globals: [Navigation, SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'default-secret-change-me-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    push: false,
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          disablePayloadAccessControl: true,
          ...(process.env.R2_PUBLIC_URL
            ? {
                generateFileURL: ({ filename, prefix }) => {
                  const parts = [process.env.R2_PUBLIC_URL, prefix, filename].filter(Boolean)
                  return parts.join('/')
                },
              }
            : {}),
        },
      },
      bucket: process.env.R2_BUCKET || '',
      config: {
        endpoint: process.env.R2_ENDPOINT || '',
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
      },
    }),
  ],
})
