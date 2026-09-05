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
    blockId: 'ora-status',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-status.png',
    alt: 'ORA application status page showing each step from HR review through the first retirement payment',
    caption: 'ORA walks employees through retirement in plain steps, on desktop or mobile.',
    createIfMissing: true,
  },
  {
    blockId: 'ora-retire-ready-history',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-retire-ready-service-history.png',
    alt: 'Retire Ready service history review with employment records and confirmation actions',
  },
  {
    blockId: 'ora-suggest-correction',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-suggest-correction.png',
    alt: 'Retire Ready correction flow for suggesting an update to an employment record',
  },
  {
    blockId: 'ora-resources',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-resources.png',
    alt: 'Retire Ready retirement resources library with guides, FAQs, videos, and calculators',
  },
  {
    blockId: 'ora-retirement-simulator',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-retirement-simulator.png',
    alt: 'Self-service retirement calculator using service history, retirement date, and High-3 salary',
  },
  {
    blockId: 'ora-retirement-scenarios',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-retirement-scenarios.png',
    alt: 'Retirement simulator comparing three retirement-age scenarios',
  },
  {
    blockId: 'ora-retirement-comparison',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-retirement-comparison.png',
    alt: 'Retirement calculator comparing three scenarios with detailed employee data',
  },
  {
    blockId: 'ora-employee-hr-review',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-employee-hr-review.png',
    alt: 'Employee service-history review with the connected HR decision surface',
  },
  {
    blockId: 'ora-suggestion-states',
    table: 'projects_blocks_image',
    sourceFilename: 'ora-suggestion-states.png',
    alt: 'Four states in the HR suggestion review workflow',
  },
  {
    blockId: 'ora-hr-review',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-hr-review.png',
    alt: 'HR service-history review showing a pending employee suggestion',
  },
  {
    blockId: 'ora-family-details',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-family-details.png',
    alt: 'ORA family details step with guided questions, spouse information, and an instant retirement estimate',
  },
  {
    blockId: 'ora-insurance-elections',
    table: 'projects_blocks_browser',
    sourceFilename: 'ora-insurance-elections.png',
    alt: 'ORA life-insurance election step written in plain language with an instant annuity estimate',
  },
]

const moduleOrder = [
  ['projects_blocks_text', 'ora-retire-ready'],
  ['projects_blocks_browser', 'ora-retire-ready-history'],
  ['projects_blocks_browser', 'ora-suggest-correction'],
  ['projects_blocks_text', 'ora-no-double-work'],
  ['projects_blocks_browser', 'ora-resources'],
  ['projects_blocks_text', 'ora-progressive-disclosure'],
  ['projects_blocks_browser', 'ora-retirement-simulator'],
  ['projects_blocks_browser', 'ora-retirement-scenarios'],
  ['projects_blocks_browser', 'ora-retirement-comparison'],
  ['projects_blocks_text', 'ora-two-audiences'],
  ['projects_blocks_browser', 'ora-employee-hr-review'],
  ['projects_blocks_image', 'ora-suggestion-states'],
  ['projects_blocks_text', 'ora-hr-loop'],
  ['projects_blocks_browser', 'ora-hr-review'],
  ['projects_blocks_text', 'ora-overview'],
  ['projects_blocks_browser', 'ora-status'],
  ['projects_blocks_browser', 'ora-family-details'],
  ['projects_blocks_text', 'ora-plain-language'],
  ['projects_blocks_browser', 'ora-insurance-elections'],
  ['projects_blocks_text', 'ora-challenges'],
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
  const extension = path.extname(asset.sourceFilename)
  const stem = path.basename(asset.sourceFilename, extension)
  const filename = `${stem}-${version}${extension}`
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
  if (env('ALLOW_ORA_CASE_STUDY_UPDATE') !== 'true') {
    throw new Error('Set ALLOW_ORA_CASE_STUDY_UPDATE=true to update the ORA case study.')
  }

  const requiredR2Env = ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']
  const missing = requiredR2Env.filter((key) => !env(key))
  if (missing.length) throw new Error(`Missing required environment values: ${missing.join(', ')}`)

  const onlyBlockId = env('ORA_ONLY_BLOCK_ID')
  const selectedAssets = onlyBlockId
    ? assets.filter((asset) => asset.blockId === onlyBlockId)
    : assets
  if (onlyBlockId && selectedAssets.length !== 1) {
    throw new Error(`Unknown ORA block id: ${onlyBlockId}`)
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
  const preparedAssets = await Promise.all(selectedAssets.map((asset) => prepareAsset(r2, asset)))

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const projectResult = onlyBlockId
      ? await db.query(`select id from projects where slug = 'ora' limit 1`)
      : await db.query(
          `update projects
           set title = 'Online Retirement',
               meta_title = 'Online Retirement',
               updated_at = now()
           where slug = 'ora'
           returning id`,
        )
    const project = projectResult.rows[0]
    if (!project) throw new Error('ORA project was not found')

    const updatedAssets = []
    let insertedOrder = null
    for (const asset of preparedAssets) {
      const blockResult = await db.query(
        `select id, _parent_id as project_id, image_id
         from ${asset.table}
         where id = $1 and _path = 'content'
         limit 1`,
        [asset.blockId],
      )
      let block = blockResult.rows[0]
      if (!block && asset.createIfMissing) {
        const desiredOrder = moduleOrder.findIndex(([, blockId]) => blockId === asset.blockId) + 1
        if (!desiredOrder) throw new Error(`Missing module order for ${asset.blockId}`)
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
        for (const table of orderedBlockTables) {
          await db.query(
            `update ${table}
             set _order = _order + 1
             where _parent_id = $1 and _path = 'content' and _order >= $2`,
            [project.id, desiredOrder],
          )
        }

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
            ($1, $2, 'content', $3, '6', 'wrap', $4, 'opm.gov', $5, 'contain', '0', 'alt', false, false, $5)`,
          [desiredOrder, project.id, asset.blockId, mediaId, asset.caption],
        )
        block = { id: asset.blockId, project_id: project.id, image_id: mediaId }
        insertedOrder = desiredOrder
      } else if (!block) {
        throw new Error(`ORA media block was not found: ${asset.blockId}`)
      } else {
        if (block.project_id !== project.id) throw new Error(`Block belongs to another project: ${asset.blockId}`)
        if (!block.image_id) throw new Error(`ORA media block has no media record: ${asset.blockId}`)

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
      }
      updatedAssets.push({ blockId: asset.blockId, filename: asset.filename, width: asset.width, height: asset.height })
    }

    const shouldUpdateModuleOrder = !onlyBlockId
    if (shouldUpdateModuleOrder) {
      for (const [index, [table, blockId]] of moduleOrder.entries()) {
        const result = await db.query(
          `update ${table}
           set _order = $1
           where id = $2 and _parent_id = $3 and _path = 'content'`,
          [index + 1, blockId, project.id],
        )
        if (result.rowCount !== 1) throw new Error(`ORA module was not found exactly once: ${blockId}`)
      }
    }

    await db.query('update projects set updated_at = now() where id = $1', [project.id])

    await db.query('commit')
    console.log(
      JSON.stringify({
        projectId: project.id,
        title: 'Online Retirement',
        updatedAssets,
        insertedOrder,
        moduleOrder: shouldUpdateModuleOrder ? moduleOrder.map(([, id]) => id) : 'unchanged',
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
