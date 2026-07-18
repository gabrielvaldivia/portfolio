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
const assetDir = path.join(rootDir, 'public', 'twinsi')

loadEnv({ path: path.join(rootDir, '.env.local') })
loadEnv({ path: path.join(rootDir, '.env') })

const env = (key) => (process.env[key] || '').trim()

const title = 'Twinsi'
const slug = 'twinsi'
const clientName = 'Twinsi'
const year = '2026'
const order = 0
const subtitle = 'A fitness companion built around your digital twin'
const description =
  'Twinsi turns workouts, goals, and everyday movement into a playful loop of avatar expression, unlockable rewards, and social content.'

const sectionBlurbs = [
  {
    key: 'homeOverview',
    title: 'Home Overview',
    body:
      'The home screen orients the user around their Twinsi, weekly health score, suggested workout, social crews, and leaderboards in one playful dashboard.',
  },
  {
    key: 'homeTabs',
    title: 'Home Tabs',
    body:
      'The tab set breaks the home experience into health, activity, and inventory views, keeping progress tracking, accomplishments, and collected items close at hand.',
  },
  {
    key: 'unlockables',
    title: 'Unlockables',
    body:
      'Progress earns spendable energy, turning rewards into outfits and item unlocks that make the avatar feel personal and alive.',
  },
  {
    key: 'workoutContent',
    title: 'Turning Workouts Into Content',
    body:
      'Workouts become prompts for shareable community posts, giving the user a path from activity completion to social proof and ongoing motivation.',
  },
  {
    key: 'creatingTwinsi',
    title: 'Creating Your Twinsi',
    body:
      'The creation flow starts from a selfie, offers outfit editing, and ends with a conversational Twinsi that feels like a companion rather than a static avatar.',
  },
  {
    key: 'onboarding',
    title: 'Onboarding',
    body:
      'Onboarding sets the tone quickly: build a Twinsi, personalize the goal, and land in a product that makes fitness feel expressive from the first run.',
  },
  {
    key: 'website',
    title: 'Website',
    body:
      'The website extends the same promise beyond the app with a colorful product story, feature education, and a direct bridge into download intent.',
  },
]

const assets = [
  {
    key: 'homeOverview01',
    filename: 'twinsi-home-overview-01.png',
    alt: 'Twinsi home overview screen with avatar, weekly goal prompt, health score, and navigation tabs',
  },
  {
    key: 'homeOverview02',
    filename: 'twinsi-home-overview-02.png',
    alt: 'Twinsi home overview screen showing up next, crews, and leaderboard modules',
  },
  {
    key: 'homeOverview03',
    filename: 'twinsi-home-overview-03.png',
    alt: 'Twinsi home overview screen scrolled through health, workouts, crews, and leaderboards',
  },
  {
    key: 'homeTabs01',
    filename: 'twinsi-home-tabs-01.png',
    alt: 'Twinsi health tab showing step count, heart rate, energy burned, and progress charts',
  },
  {
    key: 'homeTabs02',
    filename: 'twinsi-home-tabs-02.png',
    alt: 'Twinsi activity tab showing goal progress, workouts, and activity history',
  },
  {
    key: 'homeTabs03',
    filename: 'twinsi-home-tabs-03.png',
    alt: 'Twinsi inventory tab showing collected outfits, trophies, and medals',
  },
  {
    key: 'unlockables01',
    filename: 'twinsi-unlockables-01.png',
    alt: 'Twinsi shop screen showing items that can be unlocked with earned energy',
  },
  {
    key: 'unlockables02',
    filename: 'twinsi-unlockables-02.png',
    alt: 'Twinsi outfit screen with a large avatar item preview and unlock sheet',
  },
  {
    key: 'unlockables03',
    filename: 'twinsi-unlockables-03.png',
    alt: 'Twinsi unlock screen showing an outfit reward and purchase confirmation',
  },
  {
    key: 'workoutContent01',
    filename: 'twinsi-workout-content-01.png',
    alt: 'Twinsi add workout screen for turning a fitness activity into a post',
  },
  {
    key: 'workoutContent02',
    filename: 'twinsi-workout-content-02.png',
    alt: 'Twinsi community feed showing workout posts and social activity',
  },
  {
    key: 'workoutContent03',
    filename: 'twinsi-workout-content-03.png',
    alt: 'Twinsi community detail screen with comments and workout content',
  },
  {
    key: 'creatingTwinsi01',
    filename: 'twinsi-create-01.png',
    alt: 'Twinsi selfie capture screen for creating a digital twin',
  },
  {
    key: 'creatingTwinsi02',
    filename: 'twinsi-create-02.png',
    alt: 'Twinsi avatar editing screen with outfit customization controls',
  },
  {
    key: 'creatingTwinsi03',
    filename: 'twinsi-create-03.png',
    alt: 'Twinsi chat screen with a personalized avatar companion',
  },
  {
    key: 'onboarding01',
    filename: 'twinsi-onboarding-01.png',
    alt: 'Twinsi onboarding screen introducing the avatar companion',
  },
  {
    key: 'onboarding02',
    filename: 'twinsi-onboarding-02.png',
    alt: 'Twinsi onboarding screen for choosing the user goal',
  },
  {
    key: 'onboarding03',
    filename: 'twinsi-onboarding-03.png',
    alt: 'Twinsi onboarding screen showing setup progress and app promise',
  },
  {
    key: 'website',
    filename: 'twinsi-website.png',
    alt: 'Twinsi marketing website landing page',
  },
].map((asset) => ({ ...asset, mimeType: 'image/png' }))

const mobileSections = [
  ['homeOverview01', 'homeOverview02', 'homeOverview03'],
  ['homeTabs01', 'homeTabs02', 'homeTabs03'],
  ['unlockables01', 'unlockables02', 'unlockables03'],
  ['workoutContent01', 'workoutContent02', 'workoutContent03'],
  ['creatingTwinsi01', 'creatingTwinsi02', 'creatingTwinsi03'],
  ['onboarding01', 'onboarding02', 'onboarding03'],
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

async function uploadAssets(client, items) {
  const uploaded = []
  for (const item of items) {
    uploaded.push(await uploadAsset(client, item))
  }
  return uploaded
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

async function upsertClient(db) {
  const existing = await db.query('select id from clients where lower(name) = lower($1) limit 1', [
    clientName,
  ])

  if (existing.rows[0]) {
    const id = existing.rows[0].id
    await db.query(
      `update clients
       set name = $1,
           description = $2,
           active = true,
           updated_at = now()
       where id = $3`,
      [clientName, subtitle, id],
    )
    return id
  }

  const inserted = await db.query(
    `insert into clients
      (name, description, active, created_at, updated_at)
     values
      ($1, $2, true, now(), now())
     returning id`,
    [clientName, subtitle],
  )
  return inserted.rows[0].id
}

async function upsertProject(db, clientId, mediaIds) {
  const existing = await db.query('select id from projects where slug = $1 limit 1', [slug])
  const featuredImageId = mediaIds.homeOverview01

  const values = [
    title,
    slug,
    subtitle,
    richText(description),
    clientId,
    featuredImageId,
    order,
    year,
    title,
    description,
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
           updated_at = now()
       where id = $12`,
      [...values, id],
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

async function replaceTwinsiBlocks(db, projectId, mediaIds) {
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

  let orderIndex = 1
  for (const [sectionIndex, screenKeys] of mobileSections.entries()) {
    const section = sectionBlurbs[sectionIndex]
    await db.query(
      `insert into projects_blocks_text
        (_order, _parent_id, _path, id, columns, rows, title, content, block_name)
       values
        ($1, $2, 'content', $3, '6', 'wrap', $4, $5, null)`,
      [orderIndex++, projectId, `twinsi-${section.key}-text`, section.title, richText(section.body)],
    )

    for (const [screenIndex, screenKey] of screenKeys.entries()) {
      const asset = assets.find((item) => item.key === screenKey)
      await db.query(
        `insert into projects_blocks_iphone15
          (_order, _parent_id, _path, id, block_name, columns, rows, video_id, image_id, show_notch)
         values
          ($1, $2, 'content', $3, $4, '2', '3', null, $5, true)`,
        [
          orderIndex++,
          projectId,
          `twinsi-${section.key}-${screenIndex + 1}`,
          asset?.alt || `${section.title} ${screenIndex + 1}`,
          mediaIds[screenKey],
        ],
      )
    }
  }

  const websiteSection = sectionBlurbs[sectionBlurbs.length - 1]
  await db.query(
    `insert into projects_blocks_text
      (_order, _parent_id, _path, id, columns, rows, title, content, block_name)
     values
      ($1, $2, 'content', 'twinsi-website-text', '6', 'wrap', $3, $4, null)`,
    [orderIndex++, projectId, websiteSection.title, richText(websiteSection.body)],
  )

  await db.query(
    `insert into projects_blocks_image
      (_order, _parent_id, _path, id, block_name, columns, rows, image_id, caption, fit, padding, bg_color, border, rounded, shadow, image_border)
     values
      ($1, $2, 'content', 'twinsi-website', 'Twinsi website', '6', 'wrap', $3, null, 'contain', '10', 'alt', false, false, true, true)`,
    [orderIndex, projectId, mediaIds.website],
  )
}

async function main() {
  if (env('ALLOW_TWINSI_SYNC') !== 'true') {
    throw new Error(
      'sync-twinsi-cms is deprecated because the CMS is the source of truth. Set ALLOW_TWINSI_SYNC=true only if you intentionally want to overwrite Twinsi CMS content from local files.',
    )
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

  console.log('Uploading Twinsi assets to R2...')
  const uploadedAssets = await uploadAssets(r2, assets)

  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const mediaIds = {}
    for (const asset of uploadedAssets) {
      mediaIds[asset.key] = await upsertMedia(db, asset)
    }

    const clientId = await upsertClient(db)
    const projectId = await upsertProject(db, clientId, mediaIds)
    await replaceTwinsiBlocks(db, projectId, mediaIds)

    await db.query('commit')
    console.log(
      JSON.stringify(
        {
          clientId,
          projectId,
          slug,
          mediaIds,
          content: [
            'text+iphone15:Home Overview',
            'text+iphone15:Home Tabs',
            'text+iphone15:Unlockables',
            'text+iphone15:Turning Workouts Into Content',
            'text+iphone15:Creating Your Twinsi',
            'text+iphone15:Onboarding',
            'text+image:Website',
          ],
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
