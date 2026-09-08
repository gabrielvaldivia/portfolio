import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PhotoGallery } from '@/components/PhotoGallery'
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

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)
  if (!photo) notFound()

  return <PhotoGallery initialPhotoSlug={photo.slug} />
}
