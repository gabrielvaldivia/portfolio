import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { getPhotos, getPhotoBySlug, PHOTO_FEED_URL } from '@/lib/photos'

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

  const date = new Date(photo.datePublished)
  const dateLabel = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const exifSummary = exifLine(photo.exif)

  return (
    <section className="pb-20 tablet:pb-40">
      <Container>
        <Link href="/photo" className="text-muted hover:opacity-50 transition-opacity inline-flex items-center gap-2 mb-8">
          <svg className="shrink-0" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 4L6 8l4 4" /></svg>
          All photos
        </Link>
        <div className="max-w-[1000px] mx-auto">
          <Image
            src={photo.src}
            alt=""
            width={photo.width}
            height={photo.height}
            priority
            className="w-full h-auto rounded-lg"
            sizes="(min-width: 1000px) 1000px, 100vw"
          />
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-muted">{dateLabel}</p>
            {exifSummary && (
              <p className="text-muted font-mono text-sm">{exifSummary}</p>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
