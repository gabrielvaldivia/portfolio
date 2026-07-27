function getStorageSafeBuffer(value: unknown): unknown {
  if (!Buffer.isBuffer(value)) return value
  if (typeof SharedArrayBuffer === 'undefined' || !(value.buffer instanceof SharedArrayBuffer)) return value

  const copy = Buffer.allocUnsafe(value.byteLength)
  value.copy(copy)
  return copy
}

function normalizeUploadSizeBuffers(uploadSizes: unknown) {
  if (!uploadSizes || typeof uploadSizes !== 'object') return

  const sizes = uploadSizes as Record<string, unknown>
  Object.keys(sizes).forEach((key) => {
    sizes[key] = getStorageSafeBuffer(sizes[key])
  })
}

export function normalizeCloudUploadBuffers(req: any) {
  if (req.file?.data) req.file.data = getStorageSafeBuffer(req.file.data)
  normalizeUploadSizeBuffers(req.payloadUploadSizes)

  const cloudStorageContext = req.context?._payloadCloudStorage
  if (cloudStorageContext?.file?.data) {
    cloudStorageContext.file.data = getStorageSafeBuffer(cloudStorageContext.file.data)
  }
  normalizeUploadSizeBuffers(cloudStorageContext?.uploadSizes)
}
