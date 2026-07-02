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

const description =
  'An iPhone app that identifies watches from a photo using an ensemble of vision models, reconciles their structured candidates, and saves each result into a local collection with repeat sightings, rarity, location, collector context, and live eBay asking-price snapshots.'

const richText = (text) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text }],
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const assets = [
  {
    key: 'hero',
    filename: 'loupe-hero.png',
    alt: 'Loupe watch identification result shown on an iPhone',
    mimeType: 'image/png',
    width: 2236,
    height: 1734,
  },
  {
    key: 'loading',
    filename: 'loupe-loading.mp4',
    alt: 'Loupe loading animation',
    mimeType: 'video/mp4',
  },
  {
    key: 'walkthrough',
    filename: 'loupe-walkthrough.mp4',
    alt: 'Loupe app walkthrough',
    mimeType: 'video/mp4',
  },
  {
    key: 'friends',
    filename: 'loupe-friends.mp4',
    alt: 'Loupe friends demo',
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

async function replaceLoupeBlocks(db, projectId, mediaIds) {
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
      (_order, _parent_id, _path, id, block_name, columns, rows, image_id, fit, padding, bg_color, border, rounded, shadow, image_border)
     values
      (1, $1, 'content', 'loupe-hero', 'Loupe hero', '6', 'wrap', $2, 'cover', 0, 'none', false, false, false, false)`,
    [projectId, mediaIds.hero],
  )

  await db.query(
    `insert into side_projects_blocks_iphone15
      (_order, _parent_id, _path, id, block_name, columns, rows, video_id, image_id, show_notch)
     values
      (2, $1, 'content', 'loupe-loading', 'Loupe loading', '6', '4', $2, null, false),
      (4, $1, 'content', 'loupe-friends', 'Loupe friends', '6', '4', $3, null, false)`,
    [projectId, mediaIds.loading, mediaIds.friends],
  )

  await db.query(
    `update side_projects_blocks_iphone15
     set show_notch = false
     where _parent_id = $1
       and _path = 'content'
       and id = any($2::text[])`,
    [projectId, ['loupe-loading', 'loupe-friends']],
  )

  await db.query(
    `insert into side_projects_blocks_video
      (_order, _parent_id, _path, id, block_name, columns, rows, video_id, url, fit, padding, bg_color, border, autoplay, loop, muted, controls)
     values
      (3, $1, 'content', 'loupe-walkthrough', 'Loupe walkthrough', '6', '4', $2, null, 'contain', '0', 'alt', false, true, true, true, false)`,
    [projectId, mediaIds.walkthrough],
  )
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

  console.log('Uploading Loupe assets to R2...')
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

    await db.query(
      `update side_projects
       set description = $1,
           rich_description = $2,
           updated_at = now()
       where id = $3`,
      [description, richText(description), project.id],
    )

    await replaceLoupeBlocks(db, project.id, mediaIds)

    await db.query('commit')
    console.log(
      JSON.stringify(
        {
          sideProjectId: project.id,
          mediaIds,
          content: ['image:loupe-hero', 'iphone15:loupe-loading', 'video:loupe-walkthrough', 'iphone15:loupe-friends'],
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
