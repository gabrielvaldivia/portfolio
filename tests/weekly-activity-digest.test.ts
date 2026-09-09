import assert from 'node:assert/strict'
import test from 'node:test'
import type { ModuleLikeActivityItem } from '../src/lib/moduleLikeActivity'
import {
  renderWeeklyActivityEmail,
  summarizeWeeklyActivity,
} from '../src/lib/weeklyActivityDigest'

function activityItem(
  overrides: Partial<ModuleLikeActivityItem> & Pick<ModuleLikeActivityItem, 'eventType' | 'id'>,
): ModuleLikeActivityItem {
  return {
    amount: 1,
    city: '',
    country: '',
    createdAt: '2026-09-07T12:00:00.000Z',
    location: '',
    region: '',
    target: {
      href: '/work/example',
      label: 'Example project',
      noun: 'image',
      sourceTitle: 'Example project',
      thumbnail: null,
    },
    targetId: 'project:example:image:hero',
    ...overrides,
  }
}

test('summarizes every event type represented on the activity page', () => {
  const stats = summarizeWeeklyActivity([
    activityItem({ id: 'like:1', eventType: 'like', amount: 5, location: 'Brooklyn, NY' }),
    activityItem({
      id: 'highlight:1:a',
      eventType: 'highlight',
      amount: 2,
      highlightLocations: [
        { location: 'Brooklyn, NY', count: 1, country: 'US' },
        { location: 'London', count: 1, country: 'GB' },
      ],
      quote: 'A useful passage',
      target: {
        href: '/notes/example',
        label: 'Example note',
        noun: 'note',
        sourceTitle: 'Example note',
        thumbnail: null,
      },
      targetId: 'note:example:note:example',
    }),
    activityItem({
      id: 'chat:1',
      eventType: 'chat',
      amount: 2,
      location: 'Brooklyn, NY',
      targetId: 'chat:1',
    }),
  ])

  assert.deepEqual({
    chats: stats.chats,
    chatSessions: stats.chatSessions,
    highlightedNotes: stats.highlightedNotes,
    highlightedPassages: stats.highlightedPassages,
    highlightReaders: stats.highlightReaders,
    likedTargets: stats.likedTargets,
    likes: stats.likes,
  }, {
    chats: 2,
    chatSessions: 1,
    highlightedNotes: 1,
    highlightedPassages: 1,
    highlightReaders: 2,
    likedTargets: 1,
    likes: 5,
  })
  assert.deepEqual(stats.locations, [
    { location: 'Brooklyn, NY', count: 8 },
    { location: 'London', count: 1 },
  ])
  assert.equal(stats.topTargets[0].label, 'Example project')
  assert.equal(stats.highlights[0].quote, 'A useful passage')
})

test('renders a succinct escaped email with a single activity destination', () => {
  const stats = summarizeWeeklyActivity([
    activityItem({
      id: 'highlight:1:a',
      eventType: 'highlight',
      highlightLocations: [{ location: 'London', count: 1, country: 'GB' }],
      quote: '<script>alert("no")</script>',
      target: {
        href: '/notes/example',
        label: 'Notes & ideas',
        noun: 'note',
        sourceTitle: 'Notes & ideas',
        thumbnail: null,
      },
      targetId: 'note:example:note:example',
    }),
  ])

  const email = renderWeeklyActivityEmail({
    serverUrl: 'https://gabrielvaldivia.com',
    stats,
    summary: '<b>Readers found the notes.</b>',
  })

  assert.match(email.html, /Weekly portfolio activity/)
  assert.match(email.html, /View all activity/)
  assert.match(email.html, /https:\/\/gabrielvaldivia\.com\/activity/)
  assert.match(email.html, /This week, visitors left 0 likes across 0 pieces, highlighted 1 passage across 1 note \(1 reader total\), and started 0 chats across 0 visitor sessions\./)
  assert.doesNotMatch(email.html, /<script>|<b>Readers/)
  assert.match(email.html, /&lt;script&gt;/)
  assert.match(email.text, /1 highlighted passage/)
  assert.doesNotMatch(email.text, /View chat/)
})
