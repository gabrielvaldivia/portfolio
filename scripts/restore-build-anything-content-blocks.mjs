import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

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

const richText = (children) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children,
        direction: 'ltr',
      },
    ],
    direction: 'ltr',
  },
})

const text = (value, format = 0) => ({
  mode: 'normal',
  text: value,
  type: 'text',
  style: '',
  detail: 0,
  format,
  version: 1,
})

const projectDescription = richText([
  text(
    'A mobile-first creation tool that lets anyone turn a plain-language idea into a live web app. We got together for a 4-week sprint to design a playful, tactile working prototype for their consumer product: part builder, part toy, part publishing platform. Its design language was intended to feel bright, approachable, and anti-SaaS, with a polished app chassis, a memorable brand system.',
  ),
])

const mobileDesign = richText([
  text(
    'The Build Anything product was heavily inspired by analog toys like Etch-a-Sketch and the industrial design in Braun audio players. The intent was to inspire users to pick up and use it like a tactile tool and stand out from the myriad of app builders.',
  ),
])

const webDesign = richText([
  text(
    "The following are a few web 'sketches' that intentionally leave out any content so the team can focus on the system behind the design. Instead of distracting everyone with beautiful visuals to manipulate them into falling in love with a design, I use gray boxes and descriptive text to explain how the design ",
  ),
  text('works', 2),
  text(', in addition to how it looks.'),
])

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

async function main() {
  const db = new Client({ connectionString: databaseURL() })
  await db.connect()

  try {
    await db.query('begin')

    const project = await db.query(
      `select id, subtitle, featured_image_id, meta_image_id
       from projects
       where slug = $1
       for update`,
      ['build-anything'],
    )

    if (!project.rows[0]) {
      throw new Error('Build Anything project not found')
    }

    const projectId = project.rows[0].id

    for (const table of blockTables) {
      await db.query(`delete from ${table} where _parent_id = $1 and _path = $2`, [
        projectId,
        'content',
      ])
    }

    await db.query('update projects set description = $1, updated_at = now() where id = $2', [
      projectDescription,
      projectId,
    ])

    await db.query(
      `insert into projects_blocks_image
        (_order, _parent_id, _path, id, block_name, columns, rows, image_id, fit, padding, bg_color, border, rounded, shadow, image_border)
       values
        (1, $1, 'content', 'build-anything-hero-1', 'Hero 1', '6', 'wrap', 490, 'cover', 0, 'alt', false, false, false, false),
        (2, $1, 'content', 'build-anything-hero-2', 'Hero 2', '6', 'wrap', 491, 'cover', 0, 'alt', false, false, false, false),
        (9, $1, 'content', 'build-anything-website-01', 'Website 01', '6', 'wrap', 500, 'contain', 10, 'alt', false, true, true, true),
        (10, $1, 'content', 'build-anything-website-03', 'Website 03', '6', 'wrap', 502, 'contain', 10, 'alt', false, true, true, true),
        (11, $1, 'content', 'build-anything-website-02', 'Website 02', '6', 'wrap', 501, 'contain', 10, 'alt', false, true, true, true)`,
      [projectId],
    )

    await db.query(
      `insert into projects_blocks_text
        (_order, _parent_id, _path, id, columns, rows, title, content, block_name)
       values
        (3, $1, 'content', '6a45d761efbb64236fa5635c', '6', 'wrap', 'Mobile Design', $2, null),
        (8, $1, 'content', '6a45d6ddefbb64236fa5635b', '6', 'wrap', 'Web Design', $3, null)`,
      [projectId, mobileDesign, webDesign],
    )

    await db.query(
      `insert into projects_blocks_video
        (_order, _parent_id, _path, id, block_name, columns, rows, video_id, url, fit, padding, bg_color, border, autoplay, loop, muted, controls, source)
       values
        (4, $1, 'content', 'build-anything-walkthrough', 'BA walkthrough', '6', '4', 492, null, 'cover', '0', 'alt', false, true, true, true, false, 'upload')`,
      [projectId],
    )

    await db.query(
      `insert into projects_blocks_iphone15
        (_order, _parent_id, _path, id, block_name, columns, rows, video_id, image_id, show_notch)
       values
        (5, $1, 'content', 'build-anything-create-04', 'Create 04', '2', '3', null, 496, true),
        (6, $1, 'content', 'build-anything-create-03', 'Create 03', '2', '3', null, 495, true),
        (7, $1, 'content', 'build-anything-create-01', 'Create 01', '2', '3', null, 494, true)`,
      [projectId],
    )

    await db.query('commit')

    console.log(
      JSON.stringify(
        {
          restored: true,
          projectId,
          keptSubtitle: project.rows[0].subtitle,
          keptFeaturedImageId: project.rows[0].featured_image_id,
          keptMetaImageId: project.rows[0].meta_image_id,
          blocks: [
            'image:build-anything-hero-1',
            'image:build-anything-hero-2',
            'text:Mobile Design',
            'video:build-anything-walkthrough',
            'iphone15:build-anything-create-04',
            'iphone15:build-anything-create-03',
            'iphone15:build-anything-create-01 (image build-anything-create-02)',
            'text:Web Design',
            'image:build-anything-website-01',
            'image:build-anything-website-03',
            'image:build-anything-website-02',
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
