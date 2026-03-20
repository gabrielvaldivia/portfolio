import pg from 'pg'
const { Client } = pg

const PUBLIC_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev'

const logoMap = {
  'Dex': 'Dex.svg',
  'Gather': 'Gather.svg',
  'Goodword': 'goodword.svg',
  'Google Ventures': 'Google Ventures.svg',
  'Grandstand': 'Grandstand.svg',
  'Kiosk': 'Kiosk.svg',
  'National Design Studio': 'National Design Studio.svg',
  'Profile': 'Profile.svg',
  'Roon': 'roon.svg',
  'Ritual Dental': 'Ritual Dental.svg',
  'Sensible': 'Sensible.svg',
  'Slingshot': 'Slingshot AI.svg',
  'SuperMe': 'SuperMe.svg',
  'Supper': 'Supper.svg',
  'The Majority Group': 'The Majority Group.svg',
  'Workmate': 'workmate.svg',
  'World Playground': 'World Playground.svg',
  'Daylight': 'Daylight.svg',
}

const DATABASE_URI = 'postgresql://neondb_owner:npg_BoiK91LeaMNY@ep-long-math-an29pfmf-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'

async function main() {
  const client = new Client({ connectionString: DATABASE_URI })
  await client.connect()

  // Get all clients
  const { rows: clients } = await client.query('SELECT id, name FROM clients')
  console.log(`Found ${clients.length} clients`)

  // Check media table structure
  const { rows: cols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'media' ORDER BY ordinal_position
  `)
  console.log('Media columns:', cols.map(c => c.column_name).join(', '))

  for (const cl of clients) {
    const filename = logoMap[cl.name]
    if (!filename) {
      console.log(`SKIP: No logo for "${cl.name}"`)
      continue
    }

    const url = `${PUBLIC_URL}/${encodeURIComponent(filename).replace(/%20/g, '+')}`
    const alt = `${cl.name} logo`
    const now = new Date().toISOString()

    // Insert media record
    const { rows: [media] } = await client.query(
      `INSERT INTO media (alt, filename, mime_type, url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [alt, filename, 'image/svg+xml', url, now, now]
    )

    console.log(`Created media ${media.id} for ${cl.name} -> ${filename}`)

    // Attach to client
    await client.query(
      'UPDATE clients SET logo_id = $1, updated_at = $2 WHERE id = $3',
      [media.id, now, cl.id]
    )

    console.log(`  Attached to client ${cl.id}`)
  }

  await client.end()
  console.log('Done!')
}

main().catch(err => { console.error(err); process.exit(1) })
