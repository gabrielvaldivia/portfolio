import assert from 'node:assert/strict'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { up, down } from '../src/migrations/20260907_200000_add_hero_slide_pills'

test('pill storage migration is additive, repeatable, and preserves unrelated page text', async () => {
  const client = new PGlite()
  const args = { db: { execute: (query: Parameters<PgDialect['sqlToQuery']>[0]) => client.exec(new PgDialect().sqlToQuery(query).sql) } } as unknown as Parameters<typeof up>[0]
  try {
    await client.exec("CREATE TABLE pages (id integer PRIMARY KEY, title text); INSERT INTO pages VALUES (1, 'Home');")
    await up(args)
    await up(args)
    await client.exec(`INSERT INTO pages_texts ("order", parent_id, path, text) VALUES
      (1, 1, 'sections.0.slides.0.pills', 'Product Design'),
      (2, 1, 'sections.0.slides.0.pills', 'Hardware'),
      (1, 1, 'unrelated.tags', 'Keep me');`)
    await up(args)
    assert.equal((await client.query('SELECT * FROM pages_texts')).rows.length, 3)
    await down(args)
    assert.deepEqual((await client.query('SELECT text FROM pages_texts')).rows, [{ text: 'Keep me' }])
    assert.deepEqual((await client.query('SELECT title FROM pages')).rows, [{ title: 'Home' }])
  } finally {
    await client.close()
  }
})
