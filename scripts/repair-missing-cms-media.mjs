import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import pg from 'pg'

const { Client } = pg
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function databaseURL() {
  const raw = process.env.DATABASE_URI || process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URI or DATABASE_URL is required')

  const url = new URL(raw)
  if (process.env.DATABASE_POOLER_PORT) {
    url.port = process.env.DATABASE_POOLER_PORT
  } else if (url.hostname.includes('pooler.supabase.com') && url.port === '5432') {
    url.port = '6543'
  }
  return url.toString()
}

function publicURL(filename) {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '')
  if (!base) throw new Error('R2_PUBLIC_URL is required')
  return `${base}/${encodeURIComponent(filename)}`
}

async function sourcePath(filename) {
  const candidates = [
    path.join(rootDir, 'media', filename),
    path.join(rootDir, 'public', 'media', filename),
    path.join(rootDir, 'scripts', 'images', 'avatars', filename),
  ]

  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }

  return null
}

async function main() {
  const required = ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`)
  }

  const storage = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    const result = await db.query(
      `select id, filename, mime_type, url
       from media
       where url like '/api/media/file/%'
          or url is null
          or url = ''
       order by id`,
    )
    const repaired = []
    const missing = []

    for (const media of result.rows) {
      const filePath = await sourcePath(media.filename)
      if (!filePath) {
        missing.push({ id: media.id, filename: media.filename })
        continue
      }

      const body = await fs.readFile(filePath)
      await storage.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: media.filename,
          Body: body,
          ContentType: media.mime_type,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )

      const url = publicURL(media.filename)
      await db.query('update media set url = $1, updated_at = now() where id = $2', [url, media.id])
      repaired.push({ id: media.id, filename: media.filename, url })
    }

    console.log(JSON.stringify({ repaired, missing }, null, 2))
    if (missing.length) process.exitCode = 1
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
