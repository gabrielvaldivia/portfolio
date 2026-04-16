// Geocodes existing conversations' location strings via Nominatim
// and writes the resulting lat/lng back. Idempotent — skips rows that
// already have coords. Respects Nominatim's 1 req/sec policy.
//
// Usage: node --env-file=.env scripts/backfill-chat-coords.mjs
import pg from 'pg'

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI not set.')
  process.exit(1)
}

const UA = 'gabrielvaldivia.com chat-map-backfill (gabe@valdivia.works)'
const SLEEP_MS = 1100

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const client = new pg.Client({ connectionString: uri })
await client.connect()

const { rows } = await client.query(`
  SELECT id, location FROM conversations
  WHERE location IS NOT NULL
    AND location <> ''
    AND (latitude IS NULL OR longitude IS NULL)
  ORDER BY id ASC
`)

console.log(`Backfilling ${rows.length} conversation${rows.length === 1 ? '' : 's'}…`)

let hits = 0
let misses = 0
let errors = 0

for (const row of rows) {
  const q = encodeURIComponent(row.location)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'User-Agent': UA } },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        await client.query(
          'UPDATE conversations SET latitude = $1, longitude = $2 WHERE id = $3',
          [lat, lng, row.id],
        )
        hits++
        console.log(`  ✓ ${row.id}: ${row.location} → ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      } else {
        misses++
        console.log(`  ✗ ${row.id}: ${row.location} (bad coords)`)
      }
    } else {
      misses++
      console.log(`  ✗ ${row.id}: ${row.location} (no result)`)
    }
  } catch (err) {
    errors++
    console.log(`  ! ${row.id}: ${row.location} — ${err.message}`)
  }
  await sleep(SLEEP_MS)
}

await client.end()
console.log(`\nDone. ${hits} hit, ${misses} miss, ${errors} error.`)
