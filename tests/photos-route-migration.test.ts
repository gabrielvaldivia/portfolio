import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('serves Photos from the plural route and redirects legacy photo URLs', () => {
  const nextConfig = readFileSync('next.config.ts', 'utf8')
  const footer = readFileSync('src/components/Footer.tsx', 'utf8')
  const photoLibrary = readFileSync('src/lib/photos.ts', 'utf8')

  assert.equal(existsSync('src/app/(frontend)/photos/page.tsx'), true)
  assert.equal(existsSync('src/app/(frontend)/photos/feed.json/route.ts'), true)
  assert.equal(existsSync('src/app/(photo)/photos/[slug]/page.tsx'), true)
  assert.equal(existsSync('src/app/(frontend)/photo/page.tsx'), false)
  assert.equal(existsSync('src/app/(photo)/photo/[slug]/page.tsx'), false)
  assert.match(nextConfig, /source: '\/photo',[\s\S]*destination: '\/photos',[\s\S]*permanent: true/)
  assert.match(nextConfig, /source: '\/photo\/:path\+',[\s\S]*destination: '\/photos\/:path\+'/)
  assert.match(photoLibrary, /PHOTO_FEED_URL = `\$\{SITE_URL\}\/photos\/feed\.json`/)
  assert.doesNotMatch(footer, /href: '\/photo'/)
})
