import type { HighlightAttribution, PublicHighlight } from './noteHighlightAnchors'

/** Only use coarse edge-provided geography, never GPS or a third-party IP lookup. */
export function getHighlightRequestLocation(headers: Headers): string | null {
  const read = (name: string) => {
    try {
      return decodeURIComponent((headers.get(name) || '').replace(/\+/g, ' '))
        .replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
    } catch { return '' }
  }
  const city = read('x-vercel-ip-city')
  const region = read('x-vercel-ip-country-region')
  const country = read('x-vercel-ip-country').toUpperCase()
  const countryName = /^[A-Z]{2}$/.test(country) && !['XX', 'ZZ'].includes(country)
    ? new Intl.DisplayNames(['en'], { type: 'region' }).of(country) || '' : ''
  const parts = city
    ? [city, country === 'US' || country === 'CA' ? region || countryName : countryName]
    : [region, countryName]
  return [...new Set(parts.filter(Boolean))].join(', ').slice(0, 180) || null
}

export function getHighlightAttributionHeading(highlight: PublicHighlight) {
  if (highlight.count > 1) return `Highlighted by ${highlight.count} people`
  const location = highlight.attributions?.[0]?.location
  return `Highlighted by someone${location ? ` from ${location}` : ''}`
}

export function groupHighlightAttributions(attributions: HighlightAttribution[]) {
  const groups = new Map<string | null, { location: string | null; count: number; dates: { createdAt: string; count: number }[] }>()
  for (const attribution of [...attributions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const group = groups.get(attribution.location) || { location: attribution.location, count: 0, dates: [] }
    group.count++
    // Combine simultaneous readers into one date/time line at display precision.
    const minute = attribution.createdAt.slice(0, 16)
    const date = group.dates.find(date => date.createdAt.slice(0, 16) === minute)
    if (date) date.count++
    else group.dates.push({ createdAt: attribution.createdAt, count: 1 })
    groups.set(attribution.location, group)
  }
  return [...groups.values()]
}

export function formatHighlightDate(value: string, timeZone?: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone,
  }).format(date)
}
