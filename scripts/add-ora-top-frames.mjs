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
    blockId: 'ora-pin-setup',
    sourceFilename: 'ora-pin-setup.png',
    alt: 'ORA PIN setup screen for securely signing retirement documents',
    caption: 'A secure PIN lets employees certify their retirement documents.',
  },
  {
    blockId: 'ora-retirement-type',
    sourceFilename: 'ora-retirement-type.png',
    alt: 'ORA retirement type selection with voluntary, disability, and other options',
    caption: 'Employees start with the retirement path that fits their situation.',
  },
  {
    blockId: 'ora-survivor-benefits',
    sourceFilename: 'ora-survivor-benefits.png',
    alt: 'ORA survivor benefit election with plain-language options and a live annuity estimate',
    caption: 'Survivor benefit choices show their effect on the monthly estimate.',
  },
  {
    blockId: 'ora-health-insurance',
    sourceFilename: 'ora-health-insurance.png',
    alt: 'ORA health insurance election with coverage details and a live annuity estimate',
    caption: 'Health insurance elections explain coverage and monthly impact.',
  },
]

const orderedBlockTables = [
  'projects_blocks_browser',
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
  if (env('ALLOW_ORA_TOP_FRAMES_UPDATE') !== 'true') {
    throw new Error('Set ALLOW_ORA_TOP_FRAMES_UPDATE=true to add the ORA top frames.')
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

    const projectResult = await db.query(`select id from projects where slug = 'ora' limit 1`)
    const project = projectResult.rows[0]
    if (!project) throw new Error('ORA project was not found')

    const overviewResult = await db.query(
      `select _order
       from projects_blocks_text
       where id = 'ora-overview' and _parent_id = $1 and _path = 'content'
       limit 1`,
      [project.id],
    )
    const overview = overviewResult.rows[0]
    if (!overview) throw new Error('ORA overview text module was not found')

    const existingResult = await db.query(
      `select id, _order, image_id
       from projects_blocks_browser
       where _parent_id = $1 and _path = 'content' and id = any($2::varchar[])`,
      [project.id, assets.map((asset) => asset.blockId)],
    )
    if (existingResult.rowCount !== 0 && existingResult.rowCount !== assets.length) {
      throw new Error('Only some ORA top frames exist; refusing a partial update')
    }

    const firstOrder = overview._order + 1
    if (existingResult.rowCount === 0) {
      for (const table of orderedBlockTables) {
        await db.query(
          `update ${table}
           set _order = _order + $1
           where _parent_id = $2 and _path = 'content' and _order >= $3`,
          [assets.length, project.id, firstOrder],
        )
      }
    }

    const existingById = new Map(existingResult.rows.map((row) => [row.id, row]))
    const inserted = []
    for (const [index, asset] of preparedAssets.entries()) {
      const order = firstOrder + index
      const existing = existingById.get(asset.blockId)

      if (existing) {
        if (existing._order !== order) {
          throw new Error(`${asset.blockId} exists outside the expected ORA top-frame position`)
        }
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
          [asset.alt, asset.filename, asset.url, asset.file.byteLength, asset.width, asset.height, existing.image_id],
        )
        await db.query(
          `update projects_blocks_browser
           set columns = '3', rows = 'wrap', address = 'opm.gov', caption = $1,
               fit = 'contain', padding = '0', bg_color = 'alt',
               image_border = false, shadow = false, block_name = $1
           where id = $2 and _parent_id = $3 and _path = 'content'`,
          [asset.caption, asset.blockId, project.id],
        )
      } else {
        const mediaResult = await db.query(
          `insert into media
            (alt, filename, mime_type, url, filesize, width, height, created_at, updated_at)
           values
            ($1, $2, 'image/png', $3, $4, $5, $6, now(), now())
           returning id`,
          [asset.alt, asset.filename, asset.url, asset.file.byteLength, asset.width, asset.height],
        )
        const mediaId = mediaResult.rows[0].id
        await db.query(
          `insert into projects_blocks_browser
            (_order, _parent_id, _path, id, columns, rows, image_id, address, caption, fit, padding, bg_color, image_border, shadow, block_name)
           values
            ($1, $2, 'content', $3, '3', 'wrap', $4, 'opm.gov', $5, 'contain', '0', 'alt', false, false, $5)`,
          [order, project.id, asset.blockId, mediaId, asset.caption],
        )
      }

      inserted.push({
        blockId: asset.blockId,
        order,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
      })
    }

    await db.query('update projects set updated_at = now() where id = $1', [project.id])
    await db.query('commit')
    console.log(JSON.stringify({ projectId: project.id, inserted }))
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
