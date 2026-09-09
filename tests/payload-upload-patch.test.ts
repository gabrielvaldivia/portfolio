import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const readDependency = (path: string) => readFileSync(new URL(`../node_modules/${path}`, import.meta.url), 'utf8')

test('Payload upload compatibility patches survive a clean install', () => {
  const clientBundle = readDependency('@payloadcms/ui/dist/exports/client/index.js')
  const uploadInput = readDependency('@payloadcms/ui/dist/fields/Upload/Input.js')
  const s3Upload = readDependency('@payloadcms/storage-s3/dist/client/S3ClientUploadHandler.js')
  const signedURL = readDependency('@payloadcms/storage-s3/dist/generateSignedURL.js')

  assert.match(clientBundle, /inlineUploading/)
  assert.match(clientBundle, /Payload bulk upload success callback failed/)
  assert.match(clientBundle, /autoSaveInitialFiles/)
  assert.match(
    clientBundle,
    /Mt\?ut=\{\.\.\.ut,\.\.\.Se\}:ut=Se;let It=new FormData;return It\.append\("_payload",JSON\.stringify\(ut\)\)/,
  )
  assert.doesNotMatch(
    clientBundle,
    /Mt\?ut=\{\.\.\.ut,\.\.\.Se\}:ut=Se;let It=new FormData;return It\.append\("_payload",JSON\.stringify\(ct\)\)/,
  )
  assert.match(uploadInput, /inlineUploadProgress/)
  assert.match(s3Upload, /new XMLHttpRequest\(\)/)
  assert.match(s3Upload, /toast\.loading/)
  assert.doesNotMatch(signedURL, /signableHeaders/)
})
