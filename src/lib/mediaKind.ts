type MediaLike = { mimeType?: string | null; url?: string | null } | null | undefined

/** True for an uploaded video: by MIME type, or by file extension when the type is missing. */
export function isVideoMedia(media: MediaLike) {
  if (!media) return false
  if (media.mimeType) return media.mimeType.startsWith('video/')
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(media.url || '')
}
