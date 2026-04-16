import pg from 'pg'

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI not set. Run with: node --env-file=.env scripts/add-conversation-coords.mjs')
  process.exit(1)
}

const client = new pg.Client({ connectionString: uri })
await client.connect()
try {
  await client.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS latitude double precision')
  await client.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS longitude double precision')
  console.log('OK: latitude, longitude columns ensured on conversations')
} finally {
  await client.end()
}
