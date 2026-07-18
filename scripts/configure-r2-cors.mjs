import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'
import { config as loadEnv } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dirname, '..')

for (const envFile of ['.env.local', '.env']) {
  const envPath = path.join(root, envFile)
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath, override: false, quiet: true })
  }
}

const env = (key) => (process.env[key] || '').trim()
const required = ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
const missing = required.filter((key) => !env(key))

if (missing.length) {
  throw new Error(`Missing required R2 env vars: ${missing.join(', ')}`)
}

const splitList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const toOrigin = (value) => {
  const normalized = value.startsWith('http') ? value : `https://${value}`
  const origin = new URL(normalized).origin
  if (origin === 'null') {
    throw new Error(`Invalid CORS origin: ${value}`)
  }
  return origin
}

const originCandidates = [
  ...splitList(env('R2_CORS_ORIGINS')),
  env('NEXT_PUBLIC_SERVER_URL'),
  env('PAYLOAD_PUBLIC_SERVER_URL'),
  env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : undefined,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

const origins = [...new Set(originCandidates.filter(Boolean).map(toOrigin))]

if (!origins.length) {
  throw new Error('No CORS origins resolved. Set R2_CORS_ORIGINS or NEXT_PUBLIC_SERVER_URL.')
}

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['Content-Type', 'Content-Length'],
      AllowedMethods: ['GET', 'HEAD', 'PUT'],
      AllowedOrigins: origins,
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ],
}

const client = new S3Client({
  endpoint: env('R2_ENDPOINT'),
  forcePathStyle: true,
  credentials: {
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
  },
  region: 'auto',
})

const bucket = env('R2_BUCKET')
const checkOnly = process.argv.includes('--check')

if (checkOnly) {
  try {
    const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    console.log(JSON.stringify(current.CORSRules || [], null, 2))
  } catch (error) {
    if (error?.name === 'NoSuchCORSConfiguration') {
      console.log('[]')
    } else {
      throw error
    }
  }
} else {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: corsConfiguration,
    }),
  )
  console.log(`Applied R2 CORS policy for ${bucket}: ${origins.join(', ')}`)
}
