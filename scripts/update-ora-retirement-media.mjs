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
const assets = [
  {
    blockId: 'ora-retirement-simulator',
    sourceFilename: 'ora-retirement-simulator.png',
    alt: 'Self-service retirement calculator using service history, retirement date, and High-3 salary',
  },
  {
    blockId: 'ora-retirement-scenarios',
    sourceFilename: 'ora-retirement-scenarios.png',
    alt: 'Retirement simulator comparing three retirement-age scenarios',
  },
]

function databaseURL() {
  const raw = env('DATABASE_URI') || env('DATABASE_URL')
  if (!raw) throw new Error('DATABASE_URI or DATABASE_URL is required')

  const url = new URL(raw)
  if (env('DATABASE_POOLER_PORT')) url.port = env('DATABASE_POOLER_PORT')
  return url.toString()
}

async function prepareAsset(r2, asset) {
  const filePath = path.join(rootDir, 'public', 'ora', asset.sourceFilename)
  const file = await fs.readFile(filePath)
  const metadata = await sharp(file).metadata()
  const version = createHash('sha256').update(file).digest('hex').slice(0, 12)
  const stem = path.basename(asset.sourceFilename, '.png')
  const filename = `${stem}-${version}.png`
  const publicURL = env('R2_PUBLIC_URL').replace(/\/+$/, '')

  await r2.send(
    new PutObjectCommand({
      Bucket: env('R2_BUCKET'),
      Key: filename,
      Body: file,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return {
    ...asset,
    file,
    filename,
    url: `${publicURL}/${filename}`,
    width: metadata.width,
    height: metadata.height,
  }
}

async function main() {
  if (env('ALLOW_ORA_RETIREMENT_MEDIA_UPDATE') !== 'true') {
    throw new Error('Set ALLOW_ORA_RETIREMENT_MEDIA_UPDATE=true to update the two ORA retirement visuals.')
  }

  const requiredR2Env = ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']
  const missing = requiredR2Env.filter((key) => !env(key))
  if (missing.length) throw new Error(`Missing required environment values: ${missing.join(', ')}`)

  const r2 = new S3Client({
    endpoint: env('R2_ENDPOINT'),
    forcePathStyle: true,
    region: 'auto',
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  })
  const preparedAssets = await Promise.all(assets.map((asset) => prepareAsset(r2, asset)))

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')
    const updated = []
    const projectIds = new Set()

    for (const asset of preparedAssets) {
      const blockResult = await db.query(
        `select id, _parent_id as project_id, image_id
         from projects_blocks_browser
         where id = $1 and _path = 'content'
         limit 1`,
        [asset.blockId],
      )
      const block = blockResult.rows[0]
      if (!block) throw new Error(`ORA Website block was not found: ${asset.blockId}`)
      if (!block.image_id) throw new Error(`ORA Website block has no media record: ${asset.blockId}`)

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
        [asset.alt, asset.filename, asset.url, asset.file.byteLength, asset.width, asset.height, block.image_id],
      )

      projectIds.add(block.project_id)
      updated.push({
        blockId: block.id,
        mediaId: block.image_id,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
      })
    }

    for (const projectId of projectIds) {
      await db.query('update projects set updated_at = now() where id = $1', [projectId])
    }
    await db.query('commit')
    console.log(JSON.stringify({ projectIds: [...projectIds], updated }))
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
