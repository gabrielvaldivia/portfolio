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
const assetDir = path.join(rootDir, 'public', 'ora')

loadEnv({ path: process.env.ORA_ENV_FILE || path.join(rootDir, '.env.local') })

const fallbackEnv = {}
loadEnv({ path: path.join(rootDir, '.env'), processEnv: fallbackEnv })
for (const [key, value] of Object.entries(fallbackEnv)) {
  if (!process.env[key] && value) process.env[key] = value
}

const env = (key) => (process.env[key] || '').trim()

const title = 'Online Retirement'
const slug = 'ora'
const clientName = 'National Design Studio'
const year = '2026'
const order = 0
const subtitle = 'Modernizing retirement for the federal workforce'
const description =
  'ORA and Retire Ready replace a slow, paper-based federal retirement process with a guided, data-backed experience for employees and HR teams.'

const assets = [
  {
    key: 'status',
    filename: 'ora-status.png',
    alt: 'ORA application status page showing each step from HR review through the first retirement payment',
  },
  {
    key: 'familyDetails',
    filename: 'ora-family-details.png',
    alt: 'ORA family details step with guided questions, spouse information, and an instant retirement estimate',
  },
  {
    key: 'retireReadyServiceHistory',
    filename: 'ora-retire-ready-service-history.png',
    alt: 'Retire Ready service history review with employment records and confirmation actions',
  },
  {
    key: 'suggestCorrection',
    filename: 'ora-suggest-correction.png',
    alt: 'Retire Ready correction flow for suggesting an update to an employment record',
  },
  {
    key: 'resources',
    filename: 'ora-resources.png',
    alt: 'ORA retirement resources library with guides, FAQs, videos, and calculators',
  },
  {
    key: 'hrReview',
    filename: 'ora-hr-review.png',
    alt: 'HR service history review showing a pending employee suggestion',
  },
  {
    key: 'employeeHrReview',
    filename: 'ora-employee-hr-review.png',
    alt: 'Split employee and HR views of a service-history correction',
  },
  {
    key: 'suggestionStates',
    filename: 'ora-suggestion-states.png',
    alt: 'Four states in the employee suggestion workflow from draft through approval',
  },
  {
    key: 'retirementComparison',
    filename: 'ora-retirement-comparison.png',
    alt: 'Retirement calculator comparing three scenarios with detailed employee data',
  },
  {
    key: 'retirementScenarios',
    filename: 'ora-retirement-scenarios.png',
    alt: 'Retirement simulator with three side-by-side retirement age scenarios',
  },
  {
    key: 'retirementSimulator',
    filename: 'ora-retirement-simulator.png',
    alt: 'Retirement simulator with service history, retirement age, salary, and estimate controls',
  },
  {
    key: 'insuranceElections',
    filename: 'ora-insurance-elections.png',
    alt: 'ORA life-insurance election step written in plain language with an instant annuity estimate',
  },
].map((asset) => ({ ...asset, mimeType: 'image/png' }))

const services = ['Product Design', 'Design Systems', 'Strategy', 'Web Design', 'Mobile']

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
  if (env('DATABASE_POOLER_PORT')) {
    url.port = env('DATABASE_POOLER_PORT')
  } else if (url.hostname.includes('pooler.supabase.com') && url.port === '5432') {
    url.port = '6543'
  }
  return url.toString()
}

function r2URL(filename) {
  const publicURL = env('R2_PUBLIC_URL').replace(/\/+$/, '')
  if (!publicURL) throw new Error('R2_PUBLIC_URL is required')
  return [publicURL, filename].join('/')
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
  const metadata = await sharp(file).metadata()
  const version = createHash('sha256').update(file).digest('hex').slice(0, 12)
  const filename = versionedFilename(asset.filename, version)

  await client.send(
    new PutObjectCommand({
      Bucket: env('R2_BUCKET'),
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
    width: metadata.width,
    height: metadata.height,
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

async function findClient(db) {
  const result = await db.query('select id from clients where lower(name) = lower($1) limit 1', [
    clientName,
  ])
  if (!result.rows[0]) throw new Error(`${clientName} client was not found`)
  return result.rows[0].id
}

async function upsertProject(db, clientId, mediaIds) {
  const existing = await db.query('select id from projects where slug = $1 limit 1', [slug])
  const featuredImageId = mediaIds.familyDetails
  const projectDescription = richText([
    description,
    'The initiative brings two connected products together: ORA guides employees through their official retirement application, while Retire Ready helps them prepare documents, understand options, and test decisions before anything is official.',
  ])
  const metaDescription =
    'ORA and Retire Ready modernize federal retirement with guided applications, accurate employee data, scenario planning, and a clearer employee-to-HR workflow.'
  const values = [
    title,
    slug,
    subtitle,
    projectDescription,
    clientId,
    featuredImageId,
    order,
    year,
    title,
    metaDescription,
    featuredImageId,
  ]

  if (existing.rows[0]) {
    const id = existing.rows[0].id
    await db.query(
      `update projects
       set title = $1,
           slug = $2,
           subtitle = $3,
           description = $4,
           client_id = $5,
           featured_image_id = $6,
           "order" = $7,
           year = $8,
           meta_title = $9,
           meta_description = $10,
           meta_image_id = $11,
           hide = false,
           updated_at = now()
       where id = $12`,
      [...values, id],
    )
    return id
  }

  const inserted = await db.query(
    `insert into projects
      (title, slug, subtitle, description, client_id, featured_image_id, "order", year, meta_title, meta_description, meta_image_id, hide, featured, created_at, updated_at)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, now(), now())
     returning id`,
    values,
  )
  return inserted.rows[0].id
}

async function replaceServices(db, projectId) {
  const result = await db.query('select id, title from services where title = any($1::text[])', [services])
  const byTitle = new Map(result.rows.map((row) => [row.title, row.id]))
  const missing = services.filter((service) => !byTitle.has(service))
  if (missing.length) throw new Error(`Missing services: ${missing.join(', ')}`)

  await db.query("delete from projects_rels where parent_id = $1 and path = 'services'", [projectId])
  for (const [index, service] of services.entries()) {
    await db.query(
      `insert into projects_rels ("order", parent_id, path, people_id, services_id)
       values ($1, $2, 'services', null, $3)`,
      [index + 1, projectId, byTitle.get(service)],
    )
  }
}

async function insertText(db, projectId, orderIndex, id, titleText, paragraphs) {
  await db.query(
    `insert into projects_blocks_text
      (_order, _parent_id, _path, id, columns, rows, title, content, block_name)
     values
      ($1, $2, 'content', $3, '6', 'wrap', $4, $5, null)`,
    [orderIndex, projectId, id, titleText, richText(paragraphs)],
  )
}

async function insertBrowser(db, projectId, orderIndex, id, mediaId, caption, columns = '6') {
  await db.query(
    `insert into projects_blocks_browser
      (_order, _parent_id, _path, id, columns, rows, image_id, address, caption, fit, padding, bg_color, image_border, shadow, block_name)
     values
      ($1, $2, 'content', $3, $4, 'wrap', $5, 'opm.gov', $6, 'contain', '0', 'alt', false, false, $6)`,
    [orderIndex, projectId, id, columns, mediaId, caption],
  )
}

async function insertImage(db, projectId, orderIndex, id, mediaId, caption) {
  await db.query(
    `insert into projects_blocks_image
      (_order, _parent_id, _path, id, block_name, columns, rows, image_id, caption, fit, padding, bg_color, border, rounded, shadow, image_border)
     values
      ($1, $2, 'content', $3, $4, '6', 'wrap', $5, $4, 'contain', '0', 'alt', false, false, false, false)`,
    [orderIndex, projectId, id, caption, mediaId],
  )
}

async function replaceBlocks(db, projectId, mediaIds) {
  const blockTables = [
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

  for (const table of blockTables) {
    await db.query(`delete from ${table} where _parent_id = $1 and _path = $2`, [projectId, 'content'])
  }

  let index = 1
  await insertText(db, projectId, index++, 'ora-retire-ready', 'Retire Ready', [
    'Retire Ready closes the gap that used to delay retirement and first paychecks after separation. It is a pre-retirement tool that gives employees agency to prepare documents early, understand their options, and test decisions before anything is official, while giving HR a clear, low-noise way to stay in the loop.',
    'It works like a draft, getting an employee’s information about 90% complete and accurate ahead of time. When the official process begins, that work carries into ORA and only the final details remain. Retire Ready went from concept to shipped product in three months.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-retire-ready-history', mediaIds.retireReadyServiceHistory, 'Reviewing service history in Retire Ready.', '3')
  await insertBrowser(db, projectId, index++, 'ora-suggest-correction', mediaIds.suggestCorrection, 'Suggesting a correction without leaving the review flow.', '3')

  await insertText(db, projectId, index++, 'ora-no-double-work', 'No double work', [
    'Everything an employee sets up in Retire Ready—documents, decisions, and elections—carries straight over when they start their official application in ORA.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-resources', mediaIds.resources, 'A dedicated resource library explains retirement concepts through guides, FAQs, videos, and calculators.')

  await insertText(db, projectId, index++, 'ora-progressive-disclosure', 'Go as deep as you want', [
    'Some people want a quick answer; others want every detail. Progressive disclosure covers both: start simple, then reveal more depending on how far away retirement is.',
    'Sliders and simulations let employees explore what-if scenarios with their real data and see exactly how each choice affects their annuity.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-retirement-simulator', mediaIds.retirementSimulator, 'A self-service estimate built from real service history and salary data.')
  await insertBrowser(db, projectId, index++, 'ora-retirement-scenarios', mediaIds.retirementScenarios, 'Employees can create and compare retirement-age scenarios.', '3')
  await insertBrowser(db, projectId, index++, 'ora-retirement-comparison', mediaIds.retirementComparison, 'A detailed comparison shows the effect of each scenario.', '3')

  await insertText(db, projectId, index++, 'ora-two-audiences', 'One system, two audiences', [
    'Both ORA and Retire Ready have an employee-facing side and an HR-facing side. The same information needed to feel interactive, guided, and never overwhelming for employees, then translate into a fast, scannable workspace for HR without becoming two separate products.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-employee-hr-review', mediaIds.employeeHrReview, 'The employee review and HR decision surface share the same underlying case data.')
  await insertImage(db, projectId, index++, 'ora-suggestion-states', mediaIds.suggestionStates, 'Suggestion states')

  await insertText(db, projectId, index++, 'ora-hr-loop', 'A faster, cleaner loop with HR', [
    'Employees suggest; HR approves, edits, or dismisses. Preset reasons give HR context and employees a clear next step, without back-and-forth messages.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-hr-review', mediaIds.hrReview, 'HR sees what changed, why it matters, and the action required.')

  await insertText(db, projectId, index++, 'ora-overview', 'ORA & Retire Ready', [
    'This project is part of a presidential initiative to modernize the federal government’s digital infrastructure and make essential services more intuitive and accessible.',
    'The retirement initiative includes two connected products. ORA is the platform federal employees use to officially retire; Retire Ready helps them prepare ahead of time. Together, they are designed to get a first paycheck approved in under 7 days instead of 7 months for a federal workforce of 2.3 million people.',
    'ORA replaces a complex obstacle course of paper forms with a guided application that walks employees through retirement in plain steps.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-status', mediaIds.status, 'ORA walks employees through retirement in plain steps, on desktop or mobile.')
  await insertBrowser(db, projectId, index++, 'ora-family-details', mediaIds.familyDetails, 'ORA guides employees through retirement step by step while keeping a live estimate in view.')

  await insertText(db, projectId, index++, 'ora-plain-language', 'Plain language, accurate estimates', [
    'Insurance elections used to be dense and confusing. Rewriting them in plain language helps employees understand exactly what they are choosing.',
    'ORA pulls from real employee data instead of rough approximations—its biggest differentiator from other retirement platforms.',
  ])
  await insertBrowser(db, projectId, index++, 'ora-insurance-elections', mediaIds.insuranceElections, 'Insurance elections pair plain-language choices with their estimated monthly impact.')

  await insertText(db, projectId, index, 'ora-challenges', 'Challenges', [
    'Simplifying without duplicating ORA. Retire Ready needed much of the same information while staying lighter, simpler, and just as reliable. Progressive disclosure, plain language, and interactive design let complexity scale only when needed.',
    'Knowing what to flag. The team had to decide which employee activity was worth notifying HR about, and which was not, so staff could act on what mattered without being buried in non-urgent requests.',
    'Working with OPM and HR teams meant moving quickly without losing sight of the people the work was for. HR stayed hands-on throughout and tested early designs against the realities of their process.',
    'The result is a desktop and mobile system built for employees and HR, grounded in accurate data pulled directly from employee records.',
  ])
}

async function main() {
  if (env('ALLOW_ORA_SYNC') !== 'true') {
    throw new Error('Set ALLOW_ORA_SYNC=true to create or replace the ORA project in the CMS.')
  }

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

  console.log('Uploading 2x ORA case-study assets to R2...')
  const uploadedAssets = await Promise.all(assets.map((asset) => uploadAsset(r2, asset)))

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const mediaIds = {}
    for (const asset of uploadedAssets) {
      mediaIds[asset.key] = await upsertMedia(db, asset)
    }

    const clientId = await findClient(db)
    const projectId = await upsertProject(db, clientId, mediaIds)
    await replaceServices(db, projectId)
    await replaceBlocks(db, projectId, mediaIds)

    await db.query('commit')
    console.log(JSON.stringify({ clientId, projectId, slug, mediaIds }, null, 2))
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
