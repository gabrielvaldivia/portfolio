import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionConfig } from 'payload'
import { isCmsUser, withCmsUserAccess, withGlobalCmsUserAccess } from '../src/lib/cmsAccess'

const asUser = (collection?: string) => ({ req: { user: collection ? { collection } : null } }) as never

test('only CMS users pass the shared access check', () => {
  assert.equal(isCmsUser(asUser('users')), true)
  assert.equal(isCmsUser(asUser('payload-mcp-api-keys')), false)
  assert.equal(isCmsUser(asUser()), false)
})

test('collections without explicit write rules reject MCP API keys', () => {
  const publicRead = () => true
  const collection = withCmsUserAccess({ slug: 'pages', fields: [], access: { read: publicRead } } as CollectionConfig)
  assert.equal(collection.access?.read, publicRead)
  for (const operation of ['create', 'update', 'delete', 'readVersions', 'unlock'] as const) {
    const check = collection.access?.[operation] as ((args: never) => unknown) | undefined
    assert.ok(check, operation)
    assert.equal(check(asUser('payload-mcp-api-keys')), false, operation)
    assert.equal(check(asUser('users')), true, operation)
  }
})

test('globals without explicit update rules reject MCP API keys', () => {
  const global = withGlobalCmsUserAccess({ slug: 'site-settings', fields: [] })
  assert.equal(global.access?.update?.(asUser('payload-mcp-api-keys')), false)
  assert.equal(global.access?.read?.(asUser('users')), true)
})
