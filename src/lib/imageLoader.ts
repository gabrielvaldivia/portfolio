import type { ImageLoaderProps } from 'next/image'

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith('/')) {
    return src
  }
  // R2 serves static files here; width/quality params do not transform assets.
  if (src.includes('r2.dev')) {
    return src
  }
  // Fallback: use default Next.js optimization
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`
}
