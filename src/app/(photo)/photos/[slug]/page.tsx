import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PhotoGallery } from '@/components/PhotoGallery'
import { getPhotos, getPhotoBySlug, PHOTO_FEED_URL } from '@/lib/photos'
import { JsonLd } from '@/components/JsonLd'
import {
  absoluteSiteUrl,
  buildSiteStructuredData,
  personReference,
  websiteReference,
} from '@/lib/structuredData'

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
  const canonicalPath = `/photos/${encodeURIComponent(slug)}`
  const canonical = absoluteSiteUrl(canonicalPath)
  return {
    title: 'Photo — Gabriel Valdivia',
    description: photo.alt || 'Photograph by Gabriel Valdivia',
    alternates: {
      canonical,
      types: { 'application/feed+json': PHOTO_FEED_URL },
    },
    openGraph: {
      title: 'Photo — Gabriel Valdivia',
      description: photo.alt || 'Photograph by Gabriel Valdivia',
      type: 'website',
      url: canonical,
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
  const canonicalPath = `/photos/${encodeURIComponent(slug)}`
  const canonical = absoluteSiteUrl(canonicalPath)
  const structuredData = buildSiteStructuredData([{
    '@type': 'Photograph',
    '@id': `${canonical}#photograph`,
    url: canonical,
    name: photo.alt || 'Photograph by Gabriel Valdivia',
    ...(photo.alt ? { description: photo.alt } : {}),
    contentUrl: photo.src,
    width: photo.width,
    height: photo.height,
    dateCreated: photo.datePublished,
    creator: personReference(),
    isPartOf: websiteReference(),
  }])

  return (
    <>
      <JsonLd data={structuredData} />
      <PhotoGallery initialPhotoSlug={photo.slug} />
    </>
  )
}
