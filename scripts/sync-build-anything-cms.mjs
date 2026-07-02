import 'dotenv/config'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const assetDir = path.join(rootDir, 'public', 'build-anything')

const description =
  'Product and web design for Build Anything, including the create experience, website surfaces, and walkthrough video.'
const personAssetKeys = new Set(['josephCohen', 'ryanPoolos'])

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
    key: 'featured',
    filename: 'build-anything-featured-4948ea6f.png',
    alt: 'Build Anything featured image',
    mimeType: 'image/png',
    width: 1500,
    height: 1500,
  },
  {
    key: 'josephCohen',
    filename: 'joseph-cohen.jpeg',
    alt: 'Joseph Cohen',
    mimeType: 'image/jpeg',
    width: 200,
    height: 200,
  },
  {
    key: 'ryanPoolos',
    filename: 'ryan-poolos.jpg',
    alt: 'Ryan Poolos',
    mimeType: 'image/jpeg',
    width: 460,
    height: 460,
  },
  {
    key: 'hero1',
    filename: 'build-anything-hero-1.png',
    alt: 'Build Anything product interface hero',
    mimeType: 'image/png',
    width: 1500,
    height: 1125,
  },
  {
    key: 'hero2',
    filename: 'build-anything-hero-2.png',
    alt: 'Build Anything product interface hero alternate',
    mimeType: 'image/png',
    width: 1500,
    height: 1125,
  },
  {
    key: 'walkthrough',
    filename: 'build-anything-walkthrough.mp4',
    alt: 'Build Anything walkthrough video',
    mimeType: 'video/mp4',
  },
  {
    key: 'create01',
    filename: 'build-anything-create-01.png',
    alt: 'Build Anything create flow screen 1',
    mimeType: 'image/png',
    width: 402,
    height: 874,
  },
  {
    key: 'create02',
    filename: 'build-anything-create-02.png',
    alt: 'Build Anything create flow screen 2',
    mimeType: 'image/png',
    width: 402,
    height: 874,
  },
  {
    key: 'create03',
    filename: 'build-anything-create-03.png',
    alt: 'Build Anything create flow screen 3',
    mimeType: 'image/png',
    width: 402,
    height: 874,
  },
  {
    key: 'create04',
    filename: 'build-anything-create-04.png',
    alt: 'Build Anything create flow screen 4',
    mimeType: 'image/png',
    width: 402,
    height: 874,
  },
  {
    key: 'create05',
    filename: 'build-anything-create-05.png',
    alt: 'Build Anything create flow screen 5',
    mimeType: 'image/png',
    width: 402,
    height: 874,
  },
  {
    key: 'create06',
    filename: 'build-anything-create-06.png',
    alt: 'Build Anything create flow screen 6',
    mimeType: 'image/png',
    width: 402,
    height: 874,
  },
  {
    key: 'websiteLoggedOut',
    filename: 'build-anything-website-loggedout.png',
    alt: 'Build Anything logged-out website',
    mimeType: 'image/png',
    width: 1890,
    height: 1629,
  },
  {
    key: 'website01',
    filename: 'build-anything-website-01.png',
    alt: 'Build Anything website screen 1',
    mimeType: 'image/png',
    width: 1215,
    height: 870,
  },
  {
    key: 'website02',
    filename: 'build-anything-website-02.png',
    alt: 'Build Anything website screen 2',
    mimeType: 'image/png',
    width: 1214,
    height: 870,
  },
  {
    key: 'website03',
    filename: 'build-anything-website-03.png',
    alt: 'Build Anything website screen 3',
    mimeType: 'image/png',
    width: 1214,
    height: 870,
  },
  {
    key: 'website04',
    filename: 'build-anything-website-04.png',
    alt: 'Build Anything website screen 4',
    mimeType: 'image/png',
    width: 1214,
    height: 870,
  },
]

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

function r2URL(filename) {
  if (!process.env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is required')
  return [process.env.R2_PUBLIC_URL.replace(/\/$/, ''), filename].join('/')
}

function versionedFilename(filename, version) {
  const extension = path.extname(filename)
  const stem = filename.slice(0, -extension.length)
  return `${stem}-${version}${extension}`
}

function versionedFilenamePattern(filename) {
  const extension = path.extname(filename)
  const stem = filename.slice(0, -extension.length)
  return `${stem}-%${extension}`
}

async function uploadAsset(client, asset) {
  const filePath = path.join(assetDir, asset.filename)
  const file = await fs.readFile(filePath)
  const metadata = asset.mimeType.startsWith('image/') ? await sharp(file).metadata() : {}
  const version = createHash('sha256').update(file).digest('hex').slice(0, 12)
  const filename = versionedFilename(asset.filename, version)

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: filename,
      Body: file,
      ContentType: asset.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return {
    ...asset,
    sourceFilename: asset.filename,
    filename,
    filesize: file.byteLength,
    width: metadata.width || asset.width,
    height: metadata.height || asset.height,
    url: r2URL(filename),
  }
}

async function upsertMedia(db, asset) {
  const sourceFilename = asset.sourceFilename || asset.filename
  const existing = await db.query(
    'select id from media where filename = $1 or filename like $2 order by id desc limit 1',
    [sourceFilename, versionedFilenamePattern(sourceFilename)],
  )
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

async function upsertUniverseClient(db) {
  const legacy = await db.query('select id from clients where lower(name) = lower($1) limit 1', [
    'Build Anything',
  ])

  if (legacy.rows[0]) {
    const id = legacy.rows[0].id
    await db.query(
      `update clients
       set name = $1,
           updated_at = now()
       where id = $2`,
      ['Universe', id],
    )
    return id
  }

  const existing = await db.query('select id from clients where lower(name) = lower($1) limit 1', [
    'Universe',
  ])

  if (existing.rows[0]) {
    return existing.rows[0].id
  }

  const inserted = await db.query(
    `insert into clients
      (name, active, created_at, updated_at)
     values
      ($1, true, now(), now())
     returning id`,
    ['Universe'],
  )
  return inserted.rows[0].id
}

const people = [
  {
    key: 'josephCohen',
    name: 'Joseph Cohen',
    role: 'Founder',
    linkedIn: 'https://www.linkedin.com/in/josephmcohen/',
  },
  {
    key: 'ryanPoolos',
    name: 'Ryan Poolos',
    role: 'CEO',
    linkedIn: 'https://www.linkedin.com/in/ryanpoolos/',
  },
]

async function upsertPerson(db, clientId, person, photoId) {
  const existing = await db.query('select id from people where lower(name) = lower($1) limit 1', [
    person.name,
  ])

  const values = [person.name, photoId, person.linkedIn, person.role, clientId]

  if (existing.rows[0]) {
    const id = existing.rows[0].id
    await db.query(
      `update people
       set name = $1,
           photo_id = $2,
           linked_in = $3,
           role = $4,
           company_id = $5,
           updated_at = now()
       where id = $6`,
      [...values, id],
    )
    return id
  }

  const inserted = await db.query(
    `insert into people
      (name, photo_id, linked_in, role, company_id, created_at, updated_at)
     values
      ($1, $2, $3, $4, $5, now(), now())
     returning id`,
    values,
  )
  return inserted.rows[0].id
}

async function upsertProject(db, clientId, mediaIds) {
  const existing = await db.query('select id from projects where slug = $1 limit 1', ['build-anything'])

  const values = [
    'Build Anything',
    'build-anything',
    'An app builder for the rest of us',
    richText(description),
    clientId,
    mediaIds.featured,
    0,
    '2026',
    'Build Anything',
    description,
    mediaIds.featured,
  ]

  if (existing.rows[0]) {
    const id = existing.rows[0].id
    await db.query(
      `update projects
       set client_id = $1,
           featured_image_id = $2,
           meta_image_id = $3,
           updated_at = now()
       where id = $4`,
      [clientId, mediaIds.featured, mediaIds.featured, id],
    )
    return id
  }

  const inserted = await db.query(
    `insert into projects
      (title, slug, subtitle, description, client_id, featured_image_id, "order", year, meta_title, meta_description, meta_image_id, featured, created_at, updated_at)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, now(), now())
     returning id`,
    values,
  )
  return inserted.rows[0].id
}

async function updateBuildAnythingProjectClient(db, clientId) {
  const existing = await db.query('select id from projects where slug = $1 limit 1', ['build-anything'])
  if (!existing.rows[0]) return null

  const id = existing.rows[0].id
  await db.query(
    `update projects
     set client_id = $1,
         updated_at = now()
     where id = $2`,
    [clientId, id],
  )
  return id
}

async function attachPeopleToProject(db, projectId, personIds) {
  if (!projectId) return []

  const ids = personIds.filter(Boolean)
  if (!ids.length) return []

  const existing = await db.query(
    `select people_id
     from projects_rels
     where parent_id = $1
       and path = 'team'
       and people_id = any($2::int[])`,
    [projectId, ids],
  )
  const existingIds = new Set(existing.rows.map((row) => row.people_id))
  const missingIds = ids.filter((id) => !existingIds.has(id))
  if (!missingIds.length) return ids

  const maxOrder = await db.query(
    `select coalesce(max("order"), -1) as max_order
     from projects_rels
     where parent_id = $1
       and path = 'team'`,
    [projectId],
  )
  const startingOrder = Number(maxOrder.rows[0]?.max_order ?? -1) + 1

  for (const [index, personId] of missingIds.entries()) {
    await db.query(
      `insert into projects_rels
        ("order", parent_id, path, people_id)
       values
        ($1, $2, 'team', $3)`,
      [startingOrder + index, projectId, personId],
    )
  }

  return ids
}

async function replaceBuildAnythingBlocks(db, projectId, mediaIds) {
  const blockTables = [
    'projects_blocks_dc1',
    'projects_blocks_image',
    'projects_blocks_iphone13mini',
    'projects_blocks_iphone15',
    'projects_blocks_iphone5',
    'projects_blocks_iphone6',
    'projects_blocks_iphonex',
    'projects_blocks_text',
    'projects_blocks_video',
  ]

  for (const table of blockTables) {
    await db.query(`delete from ${table} where _parent_id = $1 and _path = $2`, [projectId, 'content'])
  }

  const imageBlocks = [
    [1, 'build-anything-hero-1', 'Hero 1', mediaIds.hero1],
    [2, 'build-anything-hero-2', 'Hero 2', mediaIds.hero2],
    [10, 'build-anything-website-loggedout', 'Website logged out', mediaIds.websiteLoggedOut],
    [11, 'build-anything-website-01', 'Website 01', mediaIds.website01],
    [12, 'build-anything-website-02', 'Website 02', mediaIds.website02],
    [13, 'build-anything-website-03', 'Website 03', mediaIds.website03],
    [14, 'build-anything-website-04', 'Website 04', mediaIds.website04],
  ]

  for (const [order, id, blockName, imageId] of imageBlocks) {
    await db.query(
      `insert into projects_blocks_image
        (_order, _parent_id, _path, id, block_name, columns, rows, image_id, fit, padding, bg_color, border, rounded, shadow, image_border)
       values
        ($1, $2, 'content', $3, $4, '6', 'wrap', $5, 'cover', '0', 'none', false, true, false, false)`,
      [order, projectId, id, blockName, imageId],
    )
  }

  await db.query(
    `insert into projects_blocks_video
      (_order, _parent_id, _path, id, block_name, columns, rows, video_id, url, fit, padding, bg_color, border, autoplay, loop, muted, controls)
     values
      (3, $1, 'content', 'build-anything-walkthrough', 'BA walkthrough', '6', '4', $2, null, 'contain', '0', 'alt', false, true, true, true, false)`,
    [projectId, mediaIds.walkthrough],
  )

  const createBlocks = [
    [4, 'build-anything-create-01', 'Create 01', mediaIds.create01],
    [5, 'build-anything-create-02', 'Create 02', mediaIds.create02],
    [6, 'build-anything-create-03', 'Create 03', mediaIds.create03],
    [7, 'build-anything-create-04', 'Create 04', mediaIds.create04],
    [8, 'build-anything-create-05', 'Create 05', mediaIds.create05],
    [9, 'build-anything-create-06', 'Create 06', mediaIds.create06],
  ]

  for (const [order, id, blockName, imageId] of createBlocks) {
    await db.query(
      `insert into projects_blocks_iphone15
        (_order, _parent_id, _path, id, block_name, columns, rows, video_id, image_id, show_notch)
       values
        ($1, $2, 'content', $3, $4, '2', '3', null, $5, false)`,
      [order, projectId, id, blockName, imageId],
    )
  }
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

  const peopleOnly = process.env.SYNC_UNIVERSE_PEOPLE_ONLY === '1'
  const assetsToUpload = peopleOnly ? assets.filter((asset) => personAssetKeys.has(asset.key)) : assets
  console.log(`Uploading ${peopleOnly ? 'Universe people' : 'Build Anything'} assets to R2...`)
  const uploadedAssets = await Promise.all(assetsToUpload.map((asset) => uploadAsset(r2, asset)))

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const clientId = await upsertUniverseClient(db)
    const mediaIds = {}
    for (const asset of uploadedAssets) {
      mediaIds[asset.key] = await upsertMedia(db, asset)
    }
    const personIds = {}
    for (const person of people) {
      personIds[person.key] = await upsertPerson(db, clientId, person, mediaIds[person.key])
    }
    const projectId = peopleOnly
      ? await updateBuildAnythingProjectClient(db, clientId)
      : await upsertProject(db, clientId, mediaIds)
    const attachedPersonIds = await attachPeopleToProject(
      db,
      projectId,
      people.map((person) => personIds[person.key]),
    )
    const replacedContentBlocks = !peopleOnly && process.env.SYNC_BUILD_ANYTHING_BLOCKS === '1'
    if (replacedContentBlocks) {
      await replaceBuildAnythingBlocks(db, projectId, mediaIds)
    }

    await db.query('commit')
    console.log(
      JSON.stringify(
        {
          clientId,
          personIds,
          projectId,
          attachedPersonIds,
          mode: peopleOnly ? 'people-and-client' : 'full',
          slug: 'build-anything',
          mediaIds,
          content: replacedContentBlocks
            ? [
                'image:build-anything-hero-1',
                'image:build-anything-hero-2',
                'video:build-anything-walkthrough',
                'iphone15:build-anything-create-01..06',
                'image:build-anything-website-loggedout',
                'image:build-anything-website-01..04',
              ]
            : 'preserved existing CMS content blocks',
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
