import type { ImageLoaderProps } from 'next/image'

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // If it's already an R2 URL, serve directly from R2 (it's a CDN)
  if (src.includes('r2.dev')) {
    return src
  }
  // Fallback: use default Next.js optimization
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`
}
