import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const envFileIndex = process.argv.indexOf('--env-file')
const envFile = envFileIndex >= 0 ? process.argv[envFileIndex + 1] : undefined

dotenv.config({ path: envFile, quiet: true })

for (const key of [
  'DATABASE_URI',
  'DATABASE_URL',
  'R2_BUCKET',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_URL',
]) {
  if (process.env[key]) {
    process.env[key] = process.env[key]?.trim()
  }
}

const projectSlug = 'fieldtone'
const videoBlockId = 'fieldtone-top-video'
const asset = {
  filename: 'fieldtone-top.mp4',
  localPath: path.join(rootDir, 'public', 'fieldtone', 'fieldtone-top.mp4'),
  alt: 'Fieldtone top video',
  mimeType: 'video/mp4',
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

function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`)
  }
  return `"${identifier}"`
}

async function getExistingTables(db) {
  const result = await db.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [blockTables],
  )
  return result.rows.map((row) => row.table_name)
}

async function getTableColumns(db, tableName) {
  const result = await db.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1`,
    [tableName],
  )
  return new Set(result.rows.map((row) => row.column_name))
}

async function uploadAsset(client) {
  const file = await fs.readFile(asset.localPath)

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

async function upsertMedia(db, uploadedAsset) {
  const existing = await db.query('select id from media where filename = $1 order by id desc limit 1', [
    uploadedAsset.filename,
  ])
  const values = [
    uploadedAsset.alt,
    uploadedAsset.filename,
    uploadedAsset.mimeType,
    uploadedAsset.url,
    uploadedAsset.filesize,
    uploadedAsset.width || null,
    uploadedAsset.height || null,
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

async function findExistingBlock(db, projectId, existingTables) {
  for (const table of existingTables) {
    const result = await db.query(
      `select _order from ${quoteIdentifier(table)}
       where _parent_id = $1
         and _path = 'content'
         and id = $2
       limit 1`,
      [projectId, videoBlockId],
    )

    if (result.rows[0]) {
      return {
        table,
        order: Number(result.rows[0]._order || 0),
      }
    }
  }

  return null
}

async function deleteExistingBlock(db, projectId, existingTables) {
  for (const table of existingTables) {
    await db.query(
      `delete from ${quoteIdentifier(table)}
       where _parent_id = $1
         and _path = 'content'
         and id = $2`,
      [projectId, videoBlockId],
    )
  }
}

async function closeOrderGap(db, projectId, existingTables, removedOrder) {
  for (const table of existingTables) {
    await db.query(
      `update ${quoteIdentifier(table)}
       set _order = _order - 1
       where _parent_id = $1
         and _path = 'content'
         and _order > $2`,
      [projectId, removedOrder],
    )
  }
}

async function makeTopSlot(db, projectId, existingTables) {
  for (const table of existingTables) {
    await db.query(
      `update ${quoteIdentifier(table)}
       set _order = _order + 1
       where _parent_id = $1
         and _path = 'content'
         and _order >= 0`,
      [projectId],
    )
  }
}

async function insertVideoBlock(db, projectId, mediaId) {
  const tableName = 'side_projects_blocks_video'
  const tableColumns = await getTableColumns(db, tableName)
  const row = {
    _order: 0,
    _parent_id: projectId,
    _path: 'content',
    id: videoBlockId,
    block_name: 'Top video',
    columns: '6',
    rows: 'wrap',
    video_id: mediaId,
    url: null,
    caption: null,
    fit: 'cover',
    padding: '0',
    bg_color: 'alt',
    border: false,
    autoplay: true,
    loop: true,
    muted: true,
    controls: false,
  }
  const requiredColumns = ['_order', '_parent_id', '_path', 'id', 'columns', 'rows', 'video_id']
  const missingColumns = requiredColumns.filter((column) => !tableColumns.has(column))

  if (missingColumns.length > 0) {
    throw new Error(`${tableName} is missing required columns: ${missingColumns.join(', ')}`)
  }

  const columns = Object.keys(row).filter((column) => tableColumns.has(column))
  const placeholders = columns.map((_, index) => `$${index + 1}`)
  const values = columns.map((column) => row[column])

  await db.query(
    `insert into ${quoteIdentifier(tableName)}
      (${columns.map(quoteIdentifier).join(', ')})
     values
      (${placeholders.join(', ')})`,
    values,
  )
}

async function upsertFieldtoneTopVideoBlock(db, projectId, mediaId) {
  const existingTables = await getExistingTables(db)
  const existingBlock = await findExistingBlock(db, projectId, existingTables)

  await deleteExistingBlock(db, projectId, existingTables)
  if (existingBlock) {
    await closeOrderGap(db, projectId, existingTables, existingBlock.order)
  }
  await makeTopSlot(db, projectId, existingTables)
  await insertVideoBlock(db, projectId, mediaId)
}

async function main() {
  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const projectResult = await db.query(
      `select id from side_projects
       where lower(slug) = lower($1)
          or lower(title) = lower($1)
       order by case when lower(slug) = lower($1) then 0 else 1 end
       limit 1`,
      [projectSlug],
    )
    const project = projectResult.rows[0]
    if (!project) {
      throw new Error(`Could not find side project "${projectSlug}" in this database. Use the production env that backs gabrielvaldivia.com before running this sync.`)
    }

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

    console.log('Uploading Fieldtone top video asset to R2...')
    const uploadedAsset = await uploadAsset(r2)

    const mediaId = await upsertMedia(db, uploadedAsset)
    await upsertFieldtoneTopVideoBlock(db, project.id, mediaId)
    await db.query('update side_projects set updated_at = now() where id = $1', [project.id])

    await db.query('commit')
    console.log(
      JSON.stringify(
        {
          sideProjectId: project.id,
          mediaId,
          content: [`video:${videoBlockId}`],
          order: 0,
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
