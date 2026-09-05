import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import pg from 'pg'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

loadEnv({ path: process.env.ORA_ENV_FILE || path.join(rootDir, '.env.local') })

const fallbackEnv = {}
loadEnv({ path: path.join(rootDir, '.env'), processEnv: fallbackEnv })
for (const [key, value] of Object.entries(fallbackEnv)) {
  if (!process.env[key] && value) process.env[key] = value
}

const env = (key) => (process.env[key] || '').trim()

function databaseURL() {
  const raw = env('DATABASE_URI') || env('DATABASE_URL')
  if (!raw) throw new Error('DATABASE_URI or DATABASE_URL is required')

  const url = new URL(raw)
  if (env('DATABASE_POOLER_PORT')) url.port = env('DATABASE_POOLER_PORT')
  return url.toString()
}

async function main() {
  if (env('ALLOW_ORA_STATES_UPDATE') !== 'true') {
    throw new Error('Set ALLOW_ORA_STATES_UPDATE=true to update the ORA States module.')
  }

  const requiredR2Env = ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']
  const missing = requiredR2Env.filter((key) => !env(key))
  if (missing.length) throw new Error(`Missing required environment values: ${missing.join(', ')}`)

  const sourceFilename = 'ora-suggestion-states.png'
  const filePath = path.join(rootDir, 'public', 'ora', sourceFilename)
  const file = await fs.readFile(filePath)
  const metadata = await sharp(file).metadata()
  const version = createHash('sha256').update(file).digest('hex').slice(0, 12)
  const filename = `ora-suggestion-states-${version}.png`
  const publicURL = env('R2_PUBLIC_URL').replace(/\/+$/, '')
  const url = `${publicURL}/${filename}`

  const r2 = new S3Client({
    endpoint: env('R2_ENDPOINT'),
    forcePathStyle: true,
    region: 'auto',
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  })

  await r2.send(
    new PutObjectCommand({
      Bucket: env('R2_BUCKET'),
      Key: filename,
      Body: file,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')
    const blockResult = await db.query(
      `select id, _parent_id as project_id, image_id
       from projects_blocks_image
       where id = $1 and _path = 'content'
       limit 1`,
      ['ora-suggestion-states'],
    )
    const block = blockResult.rows[0]
    if (!block) throw new Error('ORA States image block was not found')
    if (!block.image_id) throw new Error('ORA States image block has no media record')

    await db.query(
      `update media
       set alt = $1,
           filename = $2,
           mime_type = 'image/png',
           url = $3,
           filesize = $4,
           width = $5,
           height = $6,
           updated_at = now()
       where id = $7`,
      [
        'Four states in the HR suggestion review workflow',
        filename,
        url,
        file.byteLength,
        metadata.width,
        metadata.height,
        block.image_id,
      ],
    )

    await db.query(
      `update projects_blocks_image
       set padding = '0'
       where id = $1 and _path = 'content'`,
      ['ora-suggestion-states'],
    )
    await db.query('update projects set updated_at = now() where id = $1', [block.project_id])
    await db.query('commit')

    console.log(
      JSON.stringify({
        projectId: block.project_id,
        blockId: block.id,
        mediaId: block.image_id,
        filename,
        width: metadata.width,
        height: metadata.height,
        padding: '0',
      }),
    )
  } catch (error) {
    await db.query('rollback')
    throw error
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
