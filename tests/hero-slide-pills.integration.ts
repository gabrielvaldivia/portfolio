// Explicit integration check: npx payload run tests/hero-slide-pills.integration.ts
// All changes stay inside a transaction that is always rolled back.
import assert from 'node:assert/strict'
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

const payload = await getPayload({ config })
const transactionID = await payload.db.beginTransaction()
assert.ok(transactionID, 'transaction support is required; never test with committed writes')

try {
  const req = await createLocalReq({ req: { transactionID } }, payload)
  const result = await payload.find({
    collection: 'pages', where: { slug: { equals: 'home' } }, depth: 0, limit: 1, req,
  })
  const home = result.docs[0]
  assert.ok(home, 'Home exists')
  const sections = structuredClone(home.sections || [])
  const hero = sections.find(section => section.blockType === 'hero')
  assert.ok(hero?.slides?.length, 'Hero has slides')
  const labels = ['Product strategy', 'Healthcare']
  hero.slides[0].pills = labels
  await payload.update({ collection: 'pages', id: home.id, data: { sections }, depth: 0, req })
  const saved = await payload.findByID({ collection: 'pages', id: home.id, depth: 0, req })
  const savedHero = saved.sections?.find(section => section.blockType === 'hero')
  assert.deepEqual(savedHero?.slides?.[0].pills, labels)

  hero.slides[0].pills = ['Healthcare', 'Custom capability']
  await payload.update({ collection: 'pages', id: home.id, data: { sections }, depth: 0, req })
  const edited = await payload.findByID({ collection: 'pages', id: home.id, depth: 0, req })
  assert.deepEqual(edited.sections?.find(section => section.blockType === 'hero')?.slides?.[0].pills,
    ['Healthcare', 'Custom capability'])

  hero.slides[0].pills = []
  await payload.update({ collection: 'pages', id: home.id, data: { sections }, depth: 0, req })
  const cleared = await payload.findByID({ collection: 'pages', id: home.id, depth: 0, req })
  assert.deepEqual(cleared.sections?.find(section => section.blockType === 'hero')?.slides?.[0].pills, [])
  console.log('PASS: selected pills, custom labels, ordering, and empty selection save and reload')
} finally {
  await payload.db.rollbackTransaction(transactionID)
  await payload.destroy()
  console.log('Test transaction rolled back; published content unchanged')
}
