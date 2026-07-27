import type { Metadata } from 'next'
import { PhotoGallery } from '@/components/PhotoGallery'
import { PHOTO_FEED_URL } from '@/lib/photos'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Photos — Gabriel Valdivia',
  description: 'Photographs by Gabriel Valdivia',
  alternates: {
    types: { 'application/feed+json': PHOTO_FEED_URL },
  },
}

type PhotoPageSearchParams = {
  photo?: string | string[]
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function PhotoPage({
  searchParams,
}: {
  searchParams?: Promise<PhotoPageSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <PhotoGallery initialPhotoSlug={getSearchParamValue(resolvedSearchParams.photo)} />
}
