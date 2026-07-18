import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPhotos, getPhotoBySlug, PHOTO_FEED_URL } from '@/lib/photos'

export const revalidate = 60

export async function generateStaticParams() {
  const photos = await getPhotos()
  return photos.map((photo) => ({ slug: photo.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)
  if (!photo) return {}
  return {
    title: 'Photo — Gabriel Valdivia',
    alternates: {
      types: { 'application/feed+json': PHOTO_FEED_URL },
    },
    openGraph: {
      images: [{ url: photo.src, width: photo.width, height: photo.height }],
    },
  }
}

function exifLine(exif: { camera?: string; lens?: string; shutter?: string; aperture?: string; iso?: string; focal?: string }): string {
  return [
    exif.camera,
    exif.lens,
    exif.focal,
    exif.aperture,
    exif.shutter,
    exif.iso && `ISO ${exif.iso}`,
  ].filter(Boolean).join(' · ')
}

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)
  if (!photo) notFound()

  const dateLabel = new Date(photo.datePublished).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const exifSummary = exifLine(photo.exif)

  return (
    <div className="flex min-h-svh flex-col gap-5 px-5 py-5 tablet:gap-6 tablet:px-10 tablet:py-8">
      <div className="flex justify-end">
        <Link
          href="/photo"
          className="font-mono text-sm uppercase tracking-[-0.03em] text-content opacity-50 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
        >
          All photos
        </Link>
      </div>
      <div className="flex flex-1 items-center">
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          priority
          className="h-auto w-full"
          sizes="100vw"
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 font-mono text-sm uppercase tracking-[-0.03em] text-content opacity-50">
        <span>{dateLabel}</span>
        {exifSummary && <span>{exifSummary}</span>}
      </div>
    </div>
  )
}
