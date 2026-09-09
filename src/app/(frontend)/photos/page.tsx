import type { Metadata } from 'next'
import { PhotoGallery } from '@/components/PhotoGallery'
import { getPhotos, PHOTO_FEED_URL } from '@/lib/photos'
import { JsonLd } from '@/components/JsonLd'
import { absoluteSiteUrl, buildSiteStructuredData, websiteReference } from '@/lib/structuredData'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Photos — Gabriel Valdivia',
  description: 'Photographs by Gabriel Valdivia',
  alternates: {
    canonical: '/photos',
    types: { 'application/feed+json': PHOTO_FEED_URL },
  },
}

type PhotosPageSearchParams = {
  photo?: string | string[]
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams?: Promise<PhotosPageSearchParams>
}) {
  const [resolvedSearchParams, photos] = await Promise.all([
    searchParams || Promise.resolve({} as PhotosPageSearchParams),
    getPhotos(),
  ])
  const structuredData = buildSiteStructuredData([{
    '@type': 'CollectionPage',
    '@id': absoluteSiteUrl('/photos#collection-page'),
    url: absoluteSiteUrl('/photos'),
    name: 'Photos by Gabriel Valdivia',
    description: 'Photographs by Gabriel Valdivia',
    inLanguage: 'en-US',
    isPartOf: websiteReference(),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: photos.map((photo, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: photo.alt || 'Photograph by Gabriel Valdivia',
        url: absoluteSiteUrl(`/photos/${encodeURIComponent(photo.slug)}`),
      })),
    },
  }])

  return (
    <>
      <JsonLd data={structuredData} />
      <PhotoGallery initialPhotoSlug={getSearchParamValue(resolvedSearchParams.photo)} />
    </>
  )
}
