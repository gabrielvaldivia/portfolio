import { sql } from '@payloadcms/db-postgres'
import { isIP } from 'net'
import { cache } from 'react'
import { getCountryFromCoordinates } from '@/lib/coordinateCountry'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import {
  getModuleLikeAnchorId,
  getModuleLikeTargetId,
  getPhotoLikeTargetId,
  isLikeableModuleBlock,
  SUPER_MODULE_LIKE_AMOUNT,
  parseModuleLikeTargetId,
} from '@/lib/moduleLikes'
import {
  MODULE_LIKE_ACTIVITY_PAGE_SIZE,
  MODULE_LIKE_FEED_PAGE_SIZE,
} from '@/lib/moduleLikeActivityPagination'
import { getPhotos, type Photo, type PhotoExif } from '@/lib/photos'

type PortfolioActivityRow = {
  activity_id: string
  event_type: 'chat' | 'like'
  entity_id: number | string
  target_id: string | null
  amount: number | string | null
  location: string | null
  city: string | null
  region: string | null
  country: string | null
  latitude: number | string | null
  longitude: number | string | null
  activity_at: string | Date
}

type ModuleLikeFeedRow = {
  target_id: string
  like_count: number | string
  updated_at: string | Date | null
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
  block?: any
  photoInfo?: {
    dateLabel?: string
    exif?: PhotoExif
  } | null
  zoomablePhoto?: boolean
  thumbnail: {
    type: 'image' | 'video'
    url: string
    alt: string
    width?: number | null
    height?: number | null
    fit?: 'cover' | 'contain'
    padding?: string
    backgroundColor?: string
    imageBorder?: boolean
    rounded?: boolean
    frame?: ActivityThumbnailFrame
  } | null
}

export type ModuleLikeActivityItem = {
  id: string
  eventType: 'chat' | 'like'
  targetId: string
  amount: number
  createdAt: string
  location: string
  city: string
  region: string
  country: string
  target: ActivityTarget
}

export type ModuleLikeFeedItem = {
  id: string
  targetId: string
  likeCount: number
  updatedAt: string
  target: ActivityTarget
}

export type ModuleLikeActivityCursor = {
  createdAt: string
  id: string
}

export type ModuleLikeFeedCursor = {
  likeCount: number
  updatedAt: string
  targetId: string
}

export type ModuleLikeActivityPage = {
  items: ModuleLikeActivityItem[]
  nextCursor: ModuleLikeActivityCursor | null
}

export type ModuleLikeFeedPage = {
  items: ModuleLikeFeedItem[]
  nextCursor: ModuleLikeFeedCursor | null
}

const GEO_LOOKUP_TIMEOUT_MS = 900
const countryDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null
const currentCountryCodes = `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
  BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
  CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
  DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
  GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
  HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
  KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY
  MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
  NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY
  QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
  TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ
  VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\s+/)
const countryCodeByName = (() => {
  const codes = new Map<string, string>()
  if (!countryDisplayNames) return codes

  for (const code of currentCountryCodes) {
    const name = countryDisplayNames.of(code)
    if (name && name !== code) codes.set(name.trim().toLocaleLowerCase('en'), code)
  }

  codes.set('united states of america', 'US')
  return codes
})()

const DC1_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/DC1.png'
const IPHONE15_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-15.png'
const IPHONE15_NOTCH_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-15-notch.png'
const IPHONE13MINI_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone-13-mini.png'
const IPHONE5_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone5.png'
const IPHONE6_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphone6-frame.png'
const IPHONEX_FRAME_URL = 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/iphonex.png'

const feedPaddingScale: Record<string, string> = {
  '10': '2%',
  '20': '3.5%',
  '40': '5.5%',
  '60': '7.5%',
  '80': '9.5%',
}

const photoActivityDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

export function readRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows
  }
  return []
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

function getCountryCode(value: string) {
  const country = cleanLocationPart(value).split(',').at(-1)?.trim() || ''
  const normalizedCode = country.toUpperCase()
  if (/^[A-Z]{2}$/.test(normalizedCode)) return normalizedCode

  return countryCodeByName.get(country.toLocaleLowerCase('en')) || ''
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
  const sized =
    media.sizes?.xlarge ||
    media.sizes?.large ||
    media.sizes?.medium ||
    media.sizes?.small ||
    media.sizes?.thumbnail

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

function getFeedPadding(block: any) {
  const value = String(block?.padding || '0')
  return feedPaddingScale[value]
}

function getFeedBackgroundColor(block: any) {
  const value = typeof block?.bgColor === 'string' ? block.bgColor.trim() : ''

  if (!value || value === 'alt' || value === 'custom') return undefined
  if (value === 'background') return 'rgb(var(--color-background-rgb))'
  if (value === 'elevated') return 'rgb(var(--color-elevated-rgb))'
  if (value === 'none') return 'transparent'

  return value
}

function getBlockFit(block: any): 'cover' | 'contain' {
  return block?.fit === 'contain' ? 'contain' : 'cover'
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
  const presentation = {
    fit: getBlockFit(block),
    padding: getFeedPadding(block),
    backgroundColor: getFeedBackgroundColor(block),
    imageBorder: isChecked(block?.imageBorder),
    rounded: isChecked(block?.rounded),
  }

  if (image) {
    const preferred = getPreferredImage(image)
    if (!preferred.url) return null
    return {
      type: 'image' as const,
      url: preferred.url,
      alt: image.alt || caption || '',
      width: preferred.width,
      height: preferred.height,
      ...presentation,
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
      ...presentation,
      frame,
    }
  }

  return null
}

function getBlockNoun(blockType: string) {
  if (blockType === 'browser') return 'browser'
  if (blockType === 'video' || blockType === 'fullWidthVideo') return 'video'
  if (blockType === 'image' || blockType === 'fullWidthImage') return 'image'
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
      block,
      thumbnail: getBlockThumbnail(block),
    })
  })
}

function getPhotoActivityDateLabel(photo: Photo) {
  const date = new Date(photo.datePublished)
  return Number.isNaN(date.getTime()) ? '' : photoActivityDateFormatter.format(date)
}

function indexPhotoTargets(index: Map<string, ActivityTarget>, photos: Photo[]) {
  photos.forEach((photo) => {
    if (!photo.slug || !photo.src) return

    const dateLabel = getPhotoActivityDateLabel(photo)
    const label = photo.alt.trim() || (dateLabel ? `Photo from ${dateLabel}` : 'Photo')

    index.set(getPhotoLikeTargetId(photo.slug), {
      href: `/photo/${photo.slug}`,
      sourceTitle: 'Photos',
      label,
      noun: 'photo',
      block: {
        blockType: 'image',
        image: {
          url: photo.src,
          width: photo.width,
          height: photo.height,
          alt: photo.alt,
        },
        fit: 'contain',
      },
      photoInfo: {
        dateLabel,
        exif: photo.exif,
      },
      zoomablePhoto: true,
      thumbnail: {
        type: 'image',
        url: photo.src,
        alt: photo.alt || label,
        width: photo.width,
        height: photo.height,
        fit: 'cover',
      },
    })
  })
}

const getActivityTargetIndex = cache(async function getActivityTargetIndex() {
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Activity target data is temporarily unavailable')
  const [projects, sideProjects, photos] = await Promise.all([
    payload.find({ collection: 'projects', limit: 200, depth: 1, select: { title: true, slug: true, content: true } }),
    payload.find({ collection: 'side-projects', limit: 200, depth: 1, select: { title: true, slug: true, content: true } }),
    getPhotos(),
  ])
  const index = new Map<string, ActivityTarget>()

  projects.docs.forEach((project: any) => indexDocumentTargets(index, project, 'project'))
  sideProjects.docs.forEach((project: any) => indexDocumentTargets(index, project, 'side-project'))
  indexPhotoTargets(index, photos)

  return index
})

function getFallbackTarget(targetId: string): ActivityTarget {
  const parsed = parseModuleLikeTargetId(targetId)
  const sourceTitle = parsed?.slug || 'Unknown'
  const baseHref = parsed?.sourceType === 'project'
    ? `/work/${parsed.slug}`
    : parsed?.sourceType === 'side-project'
      ? `/playground/${parsed.slug}`
      : parsed?.sourceType === 'photo'
        ? `/photo/${parsed.slug}`
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

function normalizePageLimit(limit: number | null | undefined) {
  if (limit === null || limit === undefined) return null
  if (!Number.isFinite(limit)) return null

  const normalizedLimit = Math.trunc(limit)
  return normalizedLimit > 0 ? normalizedLimit : null
}

function normalizeActivityCursor(cursor: ModuleLikeActivityCursor | null | undefined) {
  if (!cursor) return null

  const createdAt = new Date(cursor.createdAt)
  const id = typeof cursor.id === 'string' ? cursor.id.trim() : ''

  if (Number.isNaN(createdAt.getTime()) || !/^(chat|like):\d+$/.test(id)) return null

  return {
    createdAt: createdAt.toISOString(),
    id,
  }
}

function normalizeFeedCursor(cursor: ModuleLikeFeedCursor | null | undefined) {
  if (!cursor) return null

  const likeCount = Number(cursor.likeCount)
  const updatedAt = new Date(cursor.updatedAt)
  const targetId = typeof cursor.targetId === 'string' ? cursor.targetId.trim() : ''

  if (!Number.isFinite(likeCount) || Number.isNaN(updatedAt.getTime()) || !targetId) return null

  return {
    likeCount: Math.max(0, Math.trunc(likeCount)),
    updatedAt: updatedAt.toISOString(),
    targetId,
  }
}

function getActivityCursor(row: PortfolioActivityRow): ModuleLikeActivityCursor | null {
  const createdAt = row.activity_at instanceof Date ? row.activity_at : new Date(row.activity_at)
  if (Number.isNaN(createdAt.getTime())) return null

  return {
    createdAt: createdAt.toISOString(),
    id: row.activity_id,
  }
}

function getFeedCursor(row: ModuleLikeFeedRow): ModuleLikeFeedCursor | null {
  const updatedAt = row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now())
  if (Number.isNaN(updatedAt.getTime())) return null

  return {
    likeCount: Math.max(0, Math.trunc(Number(row.like_count) || 0)),
    updatedAt: updatedAt.toISOString(),
    targetId: row.target_id,
  }
}

function getActivityItem(row: PortfolioActivityRow, targetIndex: Map<string, ActivityTarget>) {
  const createdAt = row.activity_at instanceof Date ? row.activity_at : new Date(row.activity_at)
  const normalizedCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString()

  if (row.event_type === 'chat') {
    const conversationId = String(row.entity_id)
    const coordinateCountry = getCountryFromCoordinates(row.latitude, row.longitude)
    const location = cleanLocationPart(row.location || '')
      || coordinateCountry
      || 'an unknown location'

    return {
      id: row.activity_id,
      eventType: 'chat' as const,
      targetId: row.activity_id,
      amount: Math.max(1, Math.trunc(Number(row.amount) || 1)),
      createdAt: normalizedCreatedAt,
      location,
      city: '',
      region: '',
      country: getCountryCode(coordinateCountry) || getCountryCode(location),
      target: {
        href: `/chat/${encodeURIComponent(conversationId)}`,
        sourceTitle: 'Chat',
        label: 'Chat',
        noun: 'chat',
        thumbnail: null,
      },
    }
  }

  if (!row.target_id) return null
  const target = getResolvedActivityTarget(targetIndex, row.target_id)
  if (!target) return null

  const derivedLocation = toLocationParts(row.city || '', row.region || '', row.country || '')
  const location = derivedLocation.location || cleanLocationPart(row.location || '') || ''

  return {
    id: row.activity_id,
    eventType: 'like' as const,
    targetId: row.target_id,
    amount: Math.min(Math.max(Math.trunc(Number(row.amount) || 1), 1), SUPER_MODULE_LIKE_AMOUNT),
    createdAt: normalizedCreatedAt,
    location,
    city: cleanLocationPart(row.city || ''),
    region: cleanRegionPart(row.region || ''),
    country: cleanRegionPart(row.country || ''),
    target,
  }
}

function getFeedItem(row: ModuleLikeFeedRow, targetIndex: Map<string, ActivityTarget>) {
  const target = getResolvedActivityTarget(targetIndex, row.target_id)
  if (!target || !target.thumbnail) return null

  const likeCount = Math.max(0, Math.trunc(Number(row.like_count) || 0))
  if (likeCount < 1) return null

  const updatedAt = row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at || Date.now())

  return {
    id: row.target_id,
    targetId: row.target_id,
    likeCount,
    updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date().toISOString() : updatedAt.toISOString(),
    target,
  }
}

export async function getModuleLikeActivityPage({
  cursor,
  limit = MODULE_LIKE_ACTIVITY_PAGE_SIZE,
}: {
  cursor?: ModuleLikeActivityCursor | null
  limit?: number | null
} = {}): Promise<ModuleLikeActivityPage> {
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Activity data is temporarily unavailable')
  const db = payload.db.drizzle
  const normalizedCursor = normalizeActivityCursor(cursor)
  const normalizedLimit = normalizePageLimit(limit)
  const cursorFilter = normalizedCursor
    ? sql`WHERE ("activity_at", "activity_id") < (${normalizedCursor.createdAt}, ${normalizedCursor.id})`
    : sql``
  const rowLimit = normalizedLimit ? normalizedLimit + 1 : null

  const result = rowLimit
    ? await db.execute(sql`
      WITH "conversation_owners" AS (
        SELECT
          *,
          COALESCE("owner_hash", 'conversation:' || "id"::text) AS "owner_key"
        FROM "conversations"
      ),
      "ordered_conversations" AS (
        SELECT
          *,
          LAG("created_at") OVER (
            PARTITION BY "owner_key"
            ORDER BY "created_at", "id"
          ) AS "previous_created_at"
        FROM "conversation_owners"
      ),
      "sessionized_conversations" AS (
        SELECT
          *,
          SUM(
            CASE
              WHEN "previous_created_at" IS NULL
                OR "created_at" - "previous_created_at" > INTERVAL '30 minutes'
              THEN 1
              ELSE 0
            END
          ) OVER (
            PARTITION BY "owner_key"
            ORDER BY "created_at", "id"
            ROWS UNBOUNDED PRECEDING
          ) AS "session_number"
        FROM "ordered_conversations"
      ),
      "grouped_conversations" AS (
        SELECT
          *,
          COUNT(*) OVER (
            PARTITION BY "owner_key", "session_number"
          )::integer AS "session_count",
          ROW_NUMBER() OVER (
            PARTITION BY "owner_key", "session_number"
            ORDER BY "created_at" DESC, "id" DESC
          ) AS "session_rank"
        FROM "sessionized_conversations"
      ),
      "activity_rows" AS (
        SELECT
          'like:' || "id"::text AS "activity_id",
          'like'::text AS "event_type",
          "id" AS "entity_id",
          "target_id",
          "amount",
          "location",
          "city",
          "region",
          "country",
          NULL::numeric AS "latitude",
          NULL::numeric AS "longitude",
          "created_at" AS "activity_at"
        FROM "module_like_events"

        UNION ALL

        SELECT
          'chat:' || "id"::text AS "activity_id",
          'chat'::text AS "event_type",
          "id" AS "entity_id",
          NULL::varchar AS "target_id",
          "session_count" AS "amount",
          "location",
          NULL::varchar AS "city",
          NULL::varchar AS "region",
          NULL::varchar AS "country",
          "latitude",
          "longitude",
          "created_at" AS "activity_at"
        FROM "grouped_conversations"
        WHERE "session_rank" = 1
      )
      SELECT "activity_id", "event_type", "entity_id", "target_id", "amount", "location", "city", "region", "country", "latitude", "longitude", "activity_at"
      FROM "activity_rows"
      ${cursorFilter}
      ORDER BY "activity_at" DESC, "activity_id" DESC
      LIMIT ${rowLimit}
    `)
    : await db.execute(sql`
      WITH "conversation_owners" AS (
        SELECT
          *,
          COALESCE("owner_hash", 'conversation:' || "id"::text) AS "owner_key"
        FROM "conversations"
      ),
      "ordered_conversations" AS (
        SELECT
          *,
          LAG("created_at") OVER (
            PARTITION BY "owner_key"
            ORDER BY "created_at", "id"
          ) AS "previous_created_at"
        FROM "conversation_owners"
      ),
      "sessionized_conversations" AS (
        SELECT
          *,
          SUM(
            CASE
              WHEN "previous_created_at" IS NULL
                OR "created_at" - "previous_created_at" > INTERVAL '30 minutes'
              THEN 1
              ELSE 0
            END
          ) OVER (
            PARTITION BY "owner_key"
            ORDER BY "created_at", "id"
            ROWS UNBOUNDED PRECEDING
          ) AS "session_number"
        FROM "ordered_conversations"
      ),
      "grouped_conversations" AS (
        SELECT
          *,
          COUNT(*) OVER (
            PARTITION BY "owner_key", "session_number"
          )::integer AS "session_count",
          ROW_NUMBER() OVER (
            PARTITION BY "owner_key", "session_number"
            ORDER BY "created_at" DESC, "id" DESC
          ) AS "session_rank"
        FROM "sessionized_conversations"
      ),
      "activity_rows" AS (
        SELECT
          'like:' || "id"::text AS "activity_id",
          'like'::text AS "event_type",
          "id" AS "entity_id",
          "target_id",
          "amount",
          "location",
          "city",
          "region",
          "country",
          NULL::numeric AS "latitude",
          NULL::numeric AS "longitude",
          "created_at" AS "activity_at"
        FROM "module_like_events"

        UNION ALL

        SELECT
          'chat:' || "id"::text AS "activity_id",
          'chat'::text AS "event_type",
          "id" AS "entity_id",
          NULL::varchar AS "target_id",
          "session_count" AS "amount",
          "location",
          NULL::varchar AS "city",
          NULL::varchar AS "region",
          NULL::varchar AS "country",
          "latitude",
          "longitude",
          "created_at" AS "activity_at"
        FROM "grouped_conversations"
        WHERE "session_rank" = 1
      )
      SELECT "activity_id", "event_type", "entity_id", "target_id", "amount", "location", "city", "region", "country", "latitude", "longitude", "activity_at"
      FROM "activity_rows"
      ${cursorFilter}
      ORDER BY "activity_at" DESC, "activity_id" DESC
    `)

  const rows = readRows<PortfolioActivityRow>(result)
  const pageRows = normalizedLimit ? rows.slice(0, normalizedLimit) : rows
  const hasMore = Boolean(normalizedLimit && rows.length > normalizedLimit)
  const lastPageRow = pageRows[pageRows.length - 1]
  const targetIndex = await getActivityTargetIndex()

  return {
    items: pageRows.flatMap((row) => {
      const item = getActivityItem(row, targetIndex)
      return item ? [item] : []
    }),
    nextCursor: hasMore && lastPageRow ? getActivityCursor(lastPageRow) : null,
  }
}

export async function getModuleLikeActivity(limit?: number | null): Promise<ModuleLikeActivityItem[]> {
  const page = await getModuleLikeActivityPage({ limit: limit ?? null })
  return page.items
}

export async function getModuleLikeFeedPage({
  cursor,
  limit = MODULE_LIKE_FEED_PAGE_SIZE,
}: {
  cursor?: ModuleLikeFeedCursor | null
  limit?: number | null
} = {}): Promise<ModuleLikeFeedPage> {
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Activity feed data is temporarily unavailable')
  const db = payload.db.drizzle
  const normalizedCursor = normalizeFeedCursor(cursor)
  const normalizedLimit = normalizePageLimit(limit)
  const cursorFilter = normalizedCursor
    ? sql`
      WHERE (
        "like_count" < ${normalizedCursor.likeCount}
        OR ("like_count" = ${normalizedCursor.likeCount} AND "updated_at" < ${normalizedCursor.updatedAt})
        OR (
          "like_count" = ${normalizedCursor.likeCount}
          AND "updated_at" = ${normalizedCursor.updatedAt}
          AND "target_id" > ${normalizedCursor.targetId}
        )
      )
    `
    : sql``
  const rowLimit = normalizedLimit ? normalizedLimit + 1 : null

  const result = rowLimit
    ? await db.execute(sql`
      WITH "feed_rows" AS (
        SELECT
          "target_id",
          COALESCE(SUM("like_count"), 0)::int AS "like_count",
          COALESCE(MAX("updated_at"), to_timestamp(0)) AS "updated_at"
        FROM "module_likes"
        GROUP BY "target_id"
        HAVING COALESCE(SUM("like_count"), 0) > 0
      )
      SELECT "target_id", "like_count", "updated_at"
      FROM "feed_rows"
      ${cursorFilter}
      ORDER BY "like_count" DESC, "updated_at" DESC, "target_id" ASC
      LIMIT ${rowLimit}
    `)
    : await db.execute(sql`
      WITH "feed_rows" AS (
        SELECT
          "target_id",
          COALESCE(SUM("like_count"), 0)::int AS "like_count",
          COALESCE(MAX("updated_at"), to_timestamp(0)) AS "updated_at"
        FROM "module_likes"
        GROUP BY "target_id"
        HAVING COALESCE(SUM("like_count"), 0) > 0
      )
      SELECT "target_id", "like_count", "updated_at"
      FROM "feed_rows"
      ${cursorFilter}
      ORDER BY "like_count" DESC, "updated_at" DESC, "target_id" ASC
    `)

  const rows = readRows<ModuleLikeFeedRow>(result)
  const pageRows = normalizedLimit ? rows.slice(0, normalizedLimit) : rows
  const hasMore = Boolean(normalizedLimit && rows.length > normalizedLimit)
  const lastPageRow = pageRows[pageRows.length - 1]
  const targetIndex = await getActivityTargetIndex()

  return {
    items: pageRows.flatMap((row) => {
      const item = getFeedItem(row, targetIndex)
      return item ? [item] : []
    }),
    nextCursor: hasMore && lastPageRow ? getFeedCursor(lastPageRow) : null,
  }
}

export async function getModuleLikeFeed(limit?: number | null): Promise<ModuleLikeFeedItem[]> {
  const page = await getModuleLikeFeedPage({ limit: limit ?? null })
  return page.items
}
