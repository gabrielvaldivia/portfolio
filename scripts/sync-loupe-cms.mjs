import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const assets = [
  {
    key: 'feed',
    filename: 'loupe-feed.mp4',
    alt: 'Loupe feed and map demo',
    mimeType: 'video/mp4',
  },
]

function databaseURL() {
  const raw = process.env.DATABASE_URI || process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URI or DATABASE_URL is required')

  const url = new URL(raw)
  if (url.hostname.includes('pooler.supabase.com') && url.port === '5432') {
    url.port = '6543'
  }
  return url.toString()
}

function r2URL(filename) {
  if (!process.env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is required')
  return [process.env.R2_PUBLIC_URL.replace(/\/$/, ''), filename].join('/')
}

async function uploadAsset(client, asset) {
  const filePath = path.join(rootDir, 'public', 'loupe', asset.filename)
  const file = await fs.readFile(filePath)

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
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
    asset.width || null,
    asset.height || null,
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

async function upsertLoupeFeedBlock(db, projectId, mediaId) {
  for (const table of blockTables) {
    await db.query(`delete from ${table} where _parent_id = $1 and _path = $2 and id = $3`, [
      projectId,
      'content',
      'loupe-feed',
    ])
  }

  let currentMaxOrder = 0
  for (const table of blockTables) {
    const result = await db.query(
      `select coalesce(max(_order), 0) as max_order from ${table} where _parent_id = $1 and _path = $2`,
      [projectId, 'content'],
    )
    currentMaxOrder = Math.max(currentMaxOrder, Number(result.rows[0]?.max_order || 0))
  }
  const nextOrder = currentMaxOrder + 1

  await db.query(
    `insert into side_projects_blocks_video
      (_order, _parent_id, _path, id, block_name, columns, rows, video_id, url, fit, padding, bg_color, border, autoplay, loop, muted, controls)
     values
      ($1, $2, 'content', 'loupe-feed', 'Loupe feed', '6', '4', $3, null, 'contain', '0', 'alt', false, true, true, true, false)`,
    [nextOrder, projectId, mediaId],
  )
  return nextOrder
}

async function main() {
  if (!process.env.R2_BUCKET || !process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required')
  }

  const r2 = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  console.log('Uploading Loupe feed asset to R2...')
  const uploadedAssets = await Promise.all(assets.map((asset) => uploadAsset(r2, asset)))

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const projectResult = await db.query('select id from side_projects where slug = $1 limit 1', ['loupe'])
    const project = projectResult.rows[0]
    if (!project) throw new Error('Could not find side project with slug "loupe"')

    const mediaIds = {}
    for (const asset of uploadedAssets) {
      mediaIds[asset.key] = await upsertMedia(db, asset)
    }

    const order = await upsertLoupeFeedBlock(db, project.id, mediaIds.feed)

    await db.query('update side_projects set updated_at = now() where id = $1', [project.id])

    await db.query('commit')
    console.log(
      JSON.stringify(
        {
          sideProjectId: project.id,
          mediaIds,
          content: ['video:loupe-feed'],
          order,
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
