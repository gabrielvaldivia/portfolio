import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import pg from 'pg'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const assetDir = path.join(rootDir, 'public', 'fieldtone')

loadEnv({ path: path.join(rootDir, '.env.local') })
loadEnv({ path: path.join(rootDir, '.env') })

const env = (key) => (process.env[key] || '').trim()

const title = 'Fieldtone'
const slug = 'fieldtone'
const legacySlug = 'fieldnote'
const year = '2026'
const order = 0
const websiteURL = 'https://fieldtone.vercel.app'
const description = 'Generative ambient music shaped by place, time, and weather'
const richDescription = [
  'Fieldtone is a browser-based ambient instrument that creates a different soundscape for every place and moment on Earth. Nothing is recorded; every note, drone, pulse, and cymatic visual is synthesized live.',
  'Each place keeps a recognizable musical character while the performance keeps changing. Location seeds the scale, tempo, instruments, rhythms, and arrangement; local time brightens or darkens the piece; live weather, wind, and rain stir the texture.',
]

const assets = [
  {
    key: 'losAngeles',
    filename: 'fieldtone-los-angeles.png',
    alt: 'Fieldtone generative ambient field for Los Angeles',
    mimeType: 'image/png',
    width: 1920,
    height: 1306,
  },
  {
    key: 'newYork',
    filename: 'fieldtone-new-york.png',
    alt: 'Fieldtone generative ambient field for New York',
    mimeType: 'image/png',
    width: 1920,
    height: 1297,
  },
  {
    key: 'tokyo',
    filename: 'fieldtone-tokyo.png',
    alt: 'Fieldtone generative ambient field for Tokyo',
    mimeType: 'image/png',
    width: 1920,
    height: 1303,
  },
]

function richText(paragraphs) {
  const items = Array.isArray(paragraphs) ? paragraphs : [paragraphs]
  return {
    root: {
      type: 'root',
      children: items.map((text) => ({
        type: 'paragraph',
        children: [{ type: 'text', text }],
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function databaseURL() {
  const raw = env('DATABASE_URI') || env('DATABASE_URL')
  if (!raw) throw new Error('DATABASE_URI or DATABASE_URL is required')

  const url = new URL(raw)
  if (url.hostname.includes('pooler.supabase.com') && url.port === '5432') {
    url.port = '6543'
  }
  return url.toString()
}

function r2URL(filename) {
  const publicURL = env('R2_PUBLIC_URL').replace(/\/+$/, '')
  if (!publicURL) throw new Error('R2_PUBLIC_URL is required')
  return [publicURL, filename].join('/')
}

async function uploadAsset(client, asset) {
  const filePath = path.join(assetDir, asset.filename)
  const file = await fs.readFile(filePath)

  await client.send(
    new PutObjectCommand({
      Bucket: env('R2_BUCKET'),
      Key: asset.filename,
      Body: file,
      ContentType: asset.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return {
    ...asset,
    filesize: file.byteLength,
    url: r2URL(asset.filename),
  }
}

async function upsertMedia(db, asset) {
  const existing = await db.query('select id from media where filename = $1 order by id desc limit 1', [
    asset.filename,
  ])
  const values = [
    asset.alt,
    asset.filename,
    asset.mimeType,
    asset.url,
    asset.filesize,
    asset.width,
    asset.height,
  ]

  if (existing.rows[0]) {
    const id = existing.rows[0].id
    await db.query(
      `update media
       set alt = $1,
           filename = $2,
           mime_type = $3,
           url = $4,
           filesize = $5,
           width = $6,
           height = $7,
           updated_at = now()
       where id = $8`,
      [...values, id],
    )
    return id
  }

  const inserted = await db.query(
    `insert into media
      (alt, filename, mime_type, url, filesize, width, height, created_at, updated_at)
     values
      ($1, $2, $3, $4, $5, $6, $7, now(), now())
     returning id`,
    values,
  )
  return inserted.rows[0].id
}

async function upsertSideProject(db, mediaIds) {
  const existing = await db.query(
    `select id
     from side_projects
     where slug = any($1::text[])
     order by case when slug = $2 then 0 else 1 end
     limit 1`,
    [[slug, legacySlug], slug],
  )

  if (existing.rows[0]) {
    const id = existing.rows[0].id
    await db.query(
      `update side_projects
       set title = $1,
           slug = $2,
           description = $3,
           rich_description = $4,
           year = $5,
           "order" = $6,
           featured_image_id = $7,
           updated_at = now()
       where id = $8`,
      [title, slug, description, richText(richDescription), year, order, mediaIds.losAngeles, id],
    )
    return id
  }

  const inserted = await db.query(
    `insert into side_projects
      (title, slug, description, rich_description, year, "order", featured_image_id, created_at, updated_at)
     values
      ($1, $2, $3, $4, $5, $6, $7, now(), now())
     returning id`,
    [title, slug, description, richText(richDescription), year, order, mediaIds.losAngeles],
  )
  return inserted.rows[0].id
}

async function replaceFieldtoneBlocks(db, projectId, mediaIds) {
  const blockTables = [
    'side_projects_blocks_dc1',
    'side_projects_blocks_image',
    'side_projects_blocks_iphone13mini',
    'side_projects_blocks_iphone15',
    'side_projects_blocks_iphone5',
    'side_projects_blocks_iphone6',
    'side_projects_blocks_iphonex',
    'side_projects_blocks_text',
    'side_projects_blocks_video',
  ]

  for (const table of blockTables) {
    await db.query(`delete from ${table} where _parent_id = $1 and _path = $2`, [projectId, 'content'])
  }

  await db.query(
    `insert into side_projects_blocks_image
      (_order, _parent_id, _path, id, block_name, columns, rows, image_id, caption, fit, padding, bg_color, border, rounded, shadow, image_border)
     values
      (1, $1, 'content', 'fieldtone-los-angeles', 'Los Angeles', '6', 'wrap', $2, 'Los Angeles at morning: clear weather, low wind, and a brighter musical field.', 'cover', '0', 'none', false, false, false, false),
      (2, $1, 'content', 'fieldtone-new-york', 'New York', '3', 'wrap', $3, 'New York under overcast skies.', 'cover', '0', 'none', false, false, false, false),
      (3, $1, 'content', 'fieldtone-tokyo', 'Tokyo', '3', 'wrap', $4, 'Tokyo at night, rendered as a denser cymatic bloom.', 'cover', '0', 'none', false, false, false, false)`,
    [projectId, mediaIds.losAngeles, mediaIds.newYork, mediaIds.tokyo],
  )
}

async function replaceFieldtoneLinks(db, projectId) {
  await db.query('delete from side_projects_links where _parent_id = $1', [projectId])
  await db.query(
    `insert into side_projects_links
      (_order, _parent_id, id, label, url)
     values
      (1, $1, 'fieldtone-website', 'Visit website', $2)`,
    [projectId, websiteURL],
  )
}

async function main() {
  if (!env('R2_BUCKET') || !env('R2_ENDPOINT') || !env('R2_ACCESS_KEY_ID') || !env('R2_SECRET_ACCESS_KEY')) {
    throw new Error('R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required')
  }

  const r2 = new S3Client({
    endpoint: env('R2_ENDPOINT'),
    forcePathStyle: true,
    region: 'auto',
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  })

  console.log('Uploading Fieldtone assets to R2...')
  const uploadedAssets = await Promise.all(assets.map((asset) => uploadAsset(r2, asset)))

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const mediaIds = {}
    for (const asset of uploadedAssets) {
      mediaIds[asset.key] = await upsertMedia(db, asset)
    }

    const sideProjectId = await upsertSideProject(db, mediaIds)
    await replaceFieldtoneLinks(db, sideProjectId)
    await replaceFieldtoneBlocks(db, sideProjectId, mediaIds)

    await db.query('commit')
    console.log(
      JSON.stringify(
        {
          sideProjectId,
          mediaIds,
          content: ['image:fieldtone-los-angeles', 'image:fieldtone-new-york', 'image:fieldtone-tokyo'],
        },
        null,
        2,
      ),
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
