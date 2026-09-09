import type { ModuleLikeActivityItem } from '@/lib/moduleLikeActivity'

export type WeeklyActivityTarget = {
  href: string
  label: string
  likes: number
  highlightedPassages: number
  highlightReaders: number
  score: number
}

export type WeeklyActivityLocation = {
  count: number
  location: string
}

export type WeeklyActivityHighlight = {
  href: string
  quote: string
  title: string
}

export type WeeklyActivityStats = {
  activityRows: number
  chats: number
  chatSessions: number
  highlightedNotes: number
  highlightedPassages: number
  highlightReaders: number
  highlights: WeeklyActivityHighlight[]
  likedTargets: number
  likes: number
  locations: WeeklyActivityLocation[]
  topTargets: WeeklyActivityTarget[]
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

function addLocation(locations: Map<string, number>, location: string, count: number) {
  const normalized = location.trim()
  if (!normalized || normalized === 'an unknown location') return
  locations.set(normalized, (locations.get(normalized) || 0) + count)
}

export function summarizeWeeklyActivity(items: ModuleLikeActivityItem[]): WeeklyActivityStats {
  const targets = new Map<string, WeeklyActivityTarget>()
  const locations = new Map<string, number>()
  const likedTargets = new Set<string>()
  const highlightedNotes = new Set<string>()
  const highlights: WeeklyActivityHighlight[] = []
  let likes = 0
  let highlightedPassages = 0
  let highlightReaders = 0
  let chats = 0
  let chatSessions = 0

  for (const item of items) {
    if (item.eventType === 'chat') {
      chats += item.amount
      chatSessions++
      addLocation(locations, item.location, item.amount)
      continue
    }

    const target = targets.get(item.targetId) || {
      href: item.target.href,
      label: item.target.label || item.target.sourceTitle,
      likes: 0,
      highlightedPassages: 0,
      highlightReaders: 0,
      score: 0,
    }

    if (item.eventType === 'like') {
      likes += item.amount
      likedTargets.add(item.targetId)
      target.likes += item.amount
      target.score += item.amount
      addLocation(locations, item.location, item.amount)
    } else {
      highlightedPassages++
      highlightReaders += item.amount
      highlightedNotes.add(item.targetId)
      target.highlightedPassages++
      target.highlightReaders += item.amount
      target.score += item.amount
      for (const group of item.highlightLocations || []) {
        addLocation(locations, group.location, group.count)
      }
      if (item.quote) {
        highlights.push({
          href: item.target.href,
          quote: item.quote,
          title: item.target.sourceTitle,
        })
      }
    }

    targets.set(item.targetId, target)
  }

  return {
    activityRows: items.length,
    chats,
    chatSessions,
    highlightedNotes: highlightedNotes.size,
    highlightedPassages,
    highlightReaders,
    highlights: highlights.slice(0, 3),
    likedTargets: likedTargets.size,
    likes,
    locations: [...locations.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))
      .slice(0, 4),
    topTargets: [...targets.values()]
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 5),
  }
}

export function getWeeklyActivityMetricLines(stats: WeeklyActivityStats) {
  const highlightDetails = stats.highlightReaders
    ? ` (${stats.highlightReaders} ${plural(stats.highlightReaders, 'reader')} total)`
    : ''

  return [
    `${stats.likes} ${plural(stats.likes, 'like')} across ${stats.likedTargets} ${plural(stats.likedTargets, 'piece')}`,
    `${stats.highlightedPassages} highlighted ${plural(stats.highlightedPassages, 'passage')}${highlightDetails} across ${stats.highlightedNotes} ${plural(stats.highlightedNotes, 'note')}`,
    `${stats.chats} ${plural(stats.chats, 'chat')} across ${stats.chatSessions} visitor ${plural(stats.chatSessions, 'session')}`,
  ]
}

function getWeeklyActivityOverview(stats: WeeklyActivityStats) {
  const highlightReaders = stats.highlightReaders
    ? ` (${stats.highlightReaders} ${plural(stats.highlightReaders, 'reader')} total)`
    : ''

  return `This week, visitors left ${stats.likes} ${plural(stats.likes, 'like')} across ${stats.likedTargets} ${plural(stats.likedTargets, 'piece')}, highlighted ${stats.highlightedPassages} ${plural(stats.highlightedPassages, 'passage')} across ${stats.highlightedNotes} ${plural(stats.highlightedNotes, 'note')}${highlightReaders}, and started ${stats.chats} ${plural(stats.chats, 'chat')} across ${stats.chatSessions} visitor ${plural(stats.chatSessions, 'session')}.`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trimEnd()}…` : normalized
}

function getTargetDetails(target: WeeklyActivityTarget) {
  const details = []
  if (target.likes) details.push(`${target.likes} ${plural(target.likes, 'like')}`)
  if (target.highlightedPassages) {
    details.push(`${target.highlightedPassages} highlighted ${plural(target.highlightedPassages, 'passage')}`)
  }
  return details.join(' · ')
}

function getAbsoluteUrl(serverUrl: string, href: string) {
  try {
    return new URL(href, serverUrl).toString()
  } catch {
    return href
  }
}

export function renderWeeklyActivityEmail({
  serverUrl,
  stats,
  summary,
}: {
  serverUrl: string
  stats: WeeklyActivityStats
  summary: string
}) {
  const overview = getWeeklyActivityOverview(stats)
  const activityUrl = getAbsoluteUrl(serverUrl, '/activity')
  const locationLine = stats.locations.length
    ? stats.locations.map((item) => `${item.location} (${item.count})`).join(' · ')
    : ''

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; color: #111;">
      <h2 style="margin: 0 0 8px;">Weekly portfolio activity</h2>
      <p style="color: #666; margin: 0 0 20px;">Past 7 days</p>
      ${summary ? `<p style="margin: 0 0 24px; line-height: 1.6;">${escapeHtml(summary)}</p>` : ''}
      <p style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 14px 0; margin: 0 0 24px; line-height: 1.6;">${escapeHtml(overview)}</p>
      ${stats.topTargets.length ? `
        <h3 style="font-size: 15px; margin: 0 0 10px;">Most engaged</h3>
        <div style="margin-bottom: 24px;">
          ${stats.topTargets.map((target) => `
            <div style="margin: 0 0 8px;">
              <a href="${escapeHtml(getAbsoluteUrl(serverUrl, target.href))}" style="color: #111; font-weight: 600; text-decoration: none;">${escapeHtml(target.label)}</a>
              <span style="color: #777;"> · ${escapeHtml(getTargetDetails(target))}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${stats.highlights.length ? `
        <h3 style="font-size: 15px; margin: 0 0 10px;">Highlighted</h3>
        <div style="margin-bottom: 24px;">
          ${stats.highlights.map((highlight) => `
            <div style="border-left: 2px solid #e5e5e5; padding-left: 12px; margin: 0 0 12px; line-height: 1.5;">
              “${escapeHtml(truncate(highlight.quote, 180))}”<br>
              <a href="${escapeHtml(getAbsoluteUrl(serverUrl, highlight.href))}" style="color: #777; font-size: 13px; text-decoration: none;">${escapeHtml(highlight.title)}</a>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${locationLine ? `<p style="color: #666; font-size: 13px; margin: 0 0 24px;"><strong style="color: #444;">Top locations:</strong> ${escapeHtml(locationLine)}</p>` : ''}
      <a href="${escapeHtml(activityUrl)}" style="color: #0070f3; text-decoration: none; font-size: 14px;">View all activity →</a>
    </div>
  `

  const text = [
    'Weekly portfolio activity',
    'Past 7 days',
    ...(summary ? ['', summary] : []),
    '',
    overview,
    ...(stats.topTargets.length
      ? ['', 'Most engaged', ...stats.topTargets.map((target) => `${target.label} · ${getTargetDetails(target)}\n${getAbsoluteUrl(serverUrl, target.href)}`)]
      : []),
    ...(stats.highlights.length
      ? ['', 'Highlighted', ...stats.highlights.map((highlight) => `“${truncate(highlight.quote, 180)}” — ${highlight.title}\n${getAbsoluteUrl(serverUrl, highlight.href)}`)]
      : []),
    ...(locationLine ? ['', `Top locations: ${locationLine}`] : []),
    '',
    `View all activity: ${activityUrl}`,
  ].join('\n')

  return { html, text }
}
