import { sql } from '@payloadcms/db-postgres'
import { isIP } from 'net'
import { getPayload } from '@/lib/payload'
import {
  getModuleLikeAnchorId,
  getModuleLikeTargetId,
  isLikeableModuleBlock,
  SUPER_MODULE_LIKE_AMOUNT,
  parseModuleLikeTargetId,
} from '@/lib/moduleLikes'

type ModuleLikeDb = Awaited<ReturnType<typeof getPayload>>['db']['drizzle']

type ModuleLikeActivityRow = {
  id: number | string
  target_id: string
  amount: number | string | null
  location: string | null
  city: string | null
  region: string | null
  country: string | null
  created_at: string | Date
}

type MediaValue = {
  alt?: string | null
  url?: string | null
  mimeType?: string | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null } | undefined>
}

type ActivityThumbnailFrame = {
  id: string
  url: string
  aspectRatio: string
  screen: {
    top: string
    bottom: string
    left: string
    right: string
    borderRadius?: string
    boxShadow?: string
  }
}

type ActivityTarget = {
  href: string
  sourceTitle: string
  label: string
  noun: string
  thumbnail: {
    type: 'image' | 'video'
    url: string
    alt: string
    width?: number | null
    height?: number | null
    frame?: ActivityThumbnailFrame
  } | null
}

export type ModuleLikeActivityItem = {
  id: string
  targetId: string
  amount: number
  createdAt: string
  location: string
  city: string
  region: string
  country: string
  target: ActivityTarget
}

let ensureModuleLikesTablesPromise: Promise<void> | null = null
const GEO_LOOKUP_TIMEOUT_MS = 900
const countryDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

const DC1_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/DC1.png'
const IPHONE15_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-15.png'
const IPHONE15_NOTCH_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-15-notch.png'
const IPHONE13MINI_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-13-mini.png'
const IPHONE5_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone5.png'
const IPHONE6_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone6-frame.png'
const IPHONEX_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphonex.png'

export function readRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows
  }
  return []
}

export function ensureModuleLikesTables(db: ModuleLikeDb) {
  if (!ensureModuleLikesTablesPromise) {
    ensureModuleLikesTablesPromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS "module_likes" (
        "id" serial PRIMARY KEY,
        "target_id" varchar NOT NULL,
        "visitor_hash" varchar NOT NULL,
        "like_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "module_likes_count_range" CHECK ("like_count" >= 0 AND "like_count" <= 50)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "module_likes_target_visitor_idx"
        ON "module_likes" ("target_id", "visitor_hash");

      CREATE INDEX IF NOT EXISTS "module_likes_target_idx"
        ON "module_likes" ("target_id");

      CREATE TABLE IF NOT EXISTS "module_like_events" (
        "id" serial PRIMARY KEY,
        "target_id" varchar NOT NULL,
        "visitor_hash" varchar NOT NULL,
        "amount" integer NOT NULL DEFAULT 1,
        "location" varchar,
        "city" varchar,
        "region" varchar,
        "country" varchar,
        "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS "module_like_events_created_at_idx"
        ON "module_like_events" ("created_at" DESC);

      CREATE INDEX IF NOT EXISTS "module_like_events_target_idx"
        ON "module_like_events" ("target_id");

      ALTER TABLE "module_like_events"
        ADD COLUMN IF NOT EXISTS "amount" integer NOT NULL DEFAULT 1;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'module_like_events_amount_range'
        ) THEN
          ALTER TABLE "module_like_events"
            ADD CONSTRAINT "module_like_events_amount_range"
            CHECK ("amount" >= 1 AND "amount" <= 5);
        END IF;
      END $$;
    `).then(() => undefined).catch((error) => {
      ensureModuleLikesTablesPromise = null
      throw error
    })
  }

  return ensureModuleLikesTablesPromise
}

function decodeLocationHeader(value: string | null) {
  if (!value) return ''

  try {
    return decodeURIComponent(value.replace(/\+/g, ' ')).trim()
  } catch {
    return value.trim()
  }
}

function cleanLocationPart(value: string) {
  return value.replace(/\s+/g, ' ').slice(0, 80)
}

function cleanRegionPart(value: string) {
  const region = cleanLocationPart(value)
  return /^[a-z]{2,3}$/i.test(region) ? region.toUpperCase() : region
}

function joinLocation(parts: string[]) {
  const cleaned = parts.map(cleanLocationPart).filter(Boolean)
  return Array.from(new Set(cleaned)).join(', ').slice(0, 180)
}

function getCountryDisplayName(country: string) {
  const value = cleanRegionPart(country)
  if (!/^[A-Z]{2}$/.test(value)) return value
  return countryDisplayNames?.of(value) || value
}

function getHeaderValue(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = decodeLocationHeader(headers.get(name))
    if (value) return value
  }

  return ''
}

function getDisplayLocation(city: string, region: string, country: string) {
  const countryName = getCountryDisplayName(country)
  const regionOrCountry = country === 'US' || country === 'CA' ? region : countryName
  return joinLocation(city ? [city, regionOrCountry] : [region, countryName])
}

function toLocationParts(cityValue: string, regionValue: string, countryValue: string) {
  const city = cleanLocationPart(cityValue)
  const region = cleanRegionPart(regionValue)
  const country = cleanRegionPart(countryValue)
  const location = getDisplayLocation(city, region, country)

  return {
    location: location || null,
    city: city || null,
    region: region || null,
    country: country || null,
  }
}

function getRequestHeaderLocation(headers: Headers) {
  return toLocationParts(
    getHeaderValue(headers, ['x-vercel-ip-city', 'cf-ipcity', 'x-appengine-city']),
    getHeaderValue(headers, ['x-vercel-ip-country-region', 'x-vercel-ip-region', 'cf-region-code', 'cf-region', 'x-appengine-region']),
    getHeaderValue(headers, ['x-vercel-ip-country', 'cf-ipcountry', 'x-appengine-country']),
  )
}

function normalizeIpAddress(value: string) {
  const trimmed = value.trim()
  const firstForwardedIp = trimmed.split(',')[0]?.trim() || ''
  const withoutIpv6Brackets = firstForwardedIp.replace(/^\[|\]$/g, '')
  const withoutIpv4Port = withoutIpv6Brackets.replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, '$1')

  return withoutIpv4Port.replace(/^::ffff:/i, '')
}

function getRequestIp(headers: Headers) {
  const rawIp = getHeaderValue(headers, [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'x-client-ip',
  ])

  return normalizeIpAddress(rawIp)
}

function isPublicIpAddress(ip: string) {
  const version = isIP(ip)
  if (!version) return false

  if (version === 6) {
    const lower = ip.toLowerCase()
    return lower !== '::1' && !lower.startsWith('fc') && !lower.startsWith('fd') && !lower.startsWith('fe80:')
  }

  const parts = ip.split('.').map(Number)
  const [a, b] = parts

  return !(
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127)
  )
}

async function getLookupLocation(ip: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEO_LOOKUP_TIMEOUT_MS)

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) return toLocationParts('', '', '')

    const data = await response.json()
    if (data?.error) return toLocationParts('', '', '')

    return toLocationParts(
      typeof data?.city === 'string' ? data.city : '',
      typeof data?.region_code === 'string' ? data.region_code : typeof data?.region === 'string' ? data.region : '',
      typeof data?.country_code === 'string' ? data.country_code : typeof data?.country === 'string' ? data.country : '',
    )
  } catch {
    return toLocationParts('', '', '')
  } finally {
    clearTimeout(timeout)
  }
}

export async function getModuleLikeRequestLocation(headers: Headers) {
  const headerLocation = getRequestHeaderLocation(headers)
  if (headerLocation.location) return headerLocation

  const ip = getRequestIp(headers)
  if (!isPublicIpAddress(ip)) return headerLocation

  return getLookupLocation(ip)
}

function getPreferredImage(media: MediaValue) {
  const sized = media.sizes?.thumbnail || media.sizes?.small || media.sizes?.medium

  return {
    url: sized?.url || media.url || '',
    width: sized?.width || media.width,
    height: sized?.height || media.height,
  }
}

function normalizeMedia(value: unknown): MediaValue | null {
  if (!value || typeof value !== 'object') return null
  const media = value as MediaValue
  return media.url ? media : null
}

function isChecked(value: unknown) {
  return value === true || value === 'true' || value === 1
}

function getBlockThumbnailFrame(block: any): ActivityThumbnailFrame | undefined {
  switch (block?.blockType) {
    case 'dc1':
      return {
        id: 'dc1',
        url: DC1_FRAME_URL,
        aspectRatio: '718 / 960',
        screen: { top: '6%', bottom: '6%', left: '6%', right: '6%' },
      }
    case 'iphone15':
      return {
        id: isChecked(block?.showNotch) ? 'iphone15-notch' : 'iphone15',
        url: isChecked(block?.showNotch) ? IPHONE15_NOTCH_FRAME_URL : IPHONE15_FRAME_URL,
        aspectRatio: '2005 / 4096',
        screen: {
          top: '2.1%',
          bottom: '2%',
          left: '4.9%',
          right: '4.9%',
          borderRadius: '10% / 5%',
          boxShadow: '0 0 0 1px #000',
        },
      }
    case 'iphone13mini':
      return {
        id: 'iphone13mini',
        url: IPHONE13MINI_FRAME_URL,
        aspectRatio: '553 / 1024',
        screen: {
          top: '7.3%',
          bottom: '7.2%',
          left: '13.5%',
          right: '13.5%',
          borderRadius: '5%',
        },
      }
    case 'iphone5':
      return {
        id: 'iphone5',
        url: IPHONE5_FRAME_URL,
        aspectRatio: '762 / 1597',
        screen: { top: '14.3%', bottom: '13.7%', left: '8.2%', right: '6.9%' },
      }
    case 'iphone6':
      return {
        id: 'iphone6',
        url: IPHONE6_FRAME_URL,
        aspectRatio: '990 / 1934',
        screen: { top: '15.4%', bottom: '15.6%', left: '12.2%', right: '11.7%' },
      }
    case 'iphonex':
      return {
        id: 'iphonex',
        url: IPHONEX_FRAME_URL,
        aspectRatio: '1405 / 2796',
        screen: {
          top: '6.2%',
          bottom: '6.5%',
          left: '10.1%',
          right: '9.7%',
          borderRadius: '5%',
        },
      }
    default:
      return undefined
  }
}

function getBlockThumbnail(block: any) {
  const image = normalizeMedia(block?.image)
  const video = normalizeMedia(block?.video)
  const caption = typeof block?.caption === 'string' ? block.caption : ''
  const frame = getBlockThumbnailFrame(block)

  if (image) {
    const preferred = getPreferredImage(image)
    if (!preferred.url) return null
    return {
      type: 'image' as const,
      url: preferred.url,
      alt: image.alt || caption || '',
      width: preferred.width,
      height: preferred.height,
      frame,
    }
  }

  if (video?.url) {
    return {
      type: 'video' as const,
      url: video.url,
      alt: video.alt || caption || '',
      width: video.width,
      height: video.height,
      frame,
    }
  }

  return null
}

function getBlockNoun(blockType: string) {
  if (blockType === 'video' || blockType === 'fullWidthVideo') return 'video'
  if (blockType === 'image' || blockType === 'fullWidthImage') return 'post'
  if (blockType.startsWith('iphone') || blockType === 'dc1' || blockType === 'deviceMockup') return 'prototype'
  return 'module'
}

function getTargetLabel(sourceTitle: string, block: any) {
  const caption = typeof block?.caption === 'string' ? block.caption.trim() : ''
  return caption ? `${sourceTitle}: ${caption}` : sourceTitle
}

function indexDocumentTargets(index: Map<string, ActivityTarget>, doc: any, sourceType: 'project' | 'side-project') {
  const slug = typeof doc?.slug === 'string' ? doc.slug : ''
  const blocks = Array.isArray(doc?.content) ? doc.content : []
  if (!slug || !blocks.length) return

  const sourceTitle = typeof doc?.title === 'string' ? doc.title : slug
  const namespace = `${sourceType}:${slug}`
  const baseHref = sourceType === 'project' ? `/work/${slug}` : `/playground/${slug}`

  blocks.forEach((block: any, indexInContent: number) => {
    if (!isLikeableModuleBlock(block?.blockType)) return

    const targetId = getModuleLikeTargetId(namespace, block, indexInContent)
    index.set(targetId, {
      href: `${baseHref}#${getModuleLikeAnchorId(targetId)}`,
      sourceTitle,
      label: getTargetLabel(sourceTitle, block),
      noun: getBlockNoun(block?.blockType || 'module'),
      thumbnail: getBlockThumbnail(block),
    })
  })
}

async function getActivityTargetIndex() {
  const payload = await getPayload()
  const [projects, sideProjects] = await Promise.all([
    payload.find({ collection: 'projects', limit: 200, depth: 3 }),
    payload.find({ collection: 'side-projects', limit: 200, depth: 3 }),
  ])
  const index = new Map<string, ActivityTarget>()

  projects.docs.forEach((project: any) => indexDocumentTargets(index, project, 'project'))
  sideProjects.docs.forEach((project: any) => indexDocumentTargets(index, project, 'side-project'))

  return index
}

function getFallbackTarget(targetId: string): ActivityTarget {
  const parsed = parseModuleLikeTargetId(targetId)
  const sourceTitle = parsed?.slug || 'Unknown'
  const baseHref = parsed?.sourceType === 'project'
    ? `/work/${parsed.slug}`
    : parsed?.sourceType === 'side-project'
      ? `/playground/${parsed.slug}`
      : '#'

  return {
    href: baseHref === '#' ? '#' : `${baseHref}#${getModuleLikeAnchorId(targetId)}`,
    sourceTitle,
    label: sourceTitle,
    noun: parsed ? getBlockNoun(parsed.blockType) : 'module',
    thumbnail: null,
  }
}

function getResolvedActivityTarget(index: Map<string, ActivityTarget>, targetId: string) {
  const target = index.get(targetId)
  if (target) return target

  return parseModuleLikeTargetId(targetId) ? null : getFallbackTarget(targetId)
}

export async function getModuleLikeActivity(limit = 100): Promise<ModuleLikeActivityItem[]> {
  const payload = await getPayload()
  const db = payload.db.drizzle

  await ensureModuleLikesTables(db)

  const result = await db.execute(sql`
    SELECT "id", "target_id", "amount", "location", "city", "region", "country", "created_at"
    FROM "module_like_events"
    ORDER BY "created_at" DESC, "id" DESC
    LIMIT ${limit}
  `)

  const rows = readRows<ModuleLikeActivityRow>(result)
  const targetIndex = await getActivityTargetIndex()

  return rows.flatMap((row) => {
    const target = getResolvedActivityTarget(targetIndex, row.target_id)
    if (!target) return []

    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at)
    const derivedLocation = toLocationParts(row.city || '', row.region || '', row.country || '')
    const location = derivedLocation.location || cleanLocationPart(row.location || '') || ''

    return [{
      id: String(row.id),
      targetId: row.target_id,
      amount: Math.min(Math.max(Math.trunc(Number(row.amount) || 1), 1), SUPER_MODULE_LIKE_AMOUNT),
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
      location,
      city: cleanLocationPart(row.city || ''),
      region: cleanRegionPart(row.region || ''),
      country: cleanRegionPart(row.country || ''),
      target,
    }]
  })
}
