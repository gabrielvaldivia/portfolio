import type { Metadata } from 'next'
import { PhotoGallery } from '@/components/PhotoGallery'
import { getPhotos, PHOTO_FEED_URL } from '@/lib/photos'
import { JsonLd } from '@/components/JsonLd'
import { absoluteSiteUrl, buildSiteStructuredData, websiteReference } from '@/lib/structuredData'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Photos — Gabriel Valdivia',
  description: 'Photographs by Gabriel Valdivia',
  alternates: {
    canonical: '/photos',
    types: { 'application/feed+json': PHOTO_FEED_URL },
  },
}

// ?photo= deep links open in the gallery on the client, so this page stays static.
export default async function PhotosPage() {
  const photos = await getPhotos()
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
      <PhotoGallery />
    </>
  )
}
