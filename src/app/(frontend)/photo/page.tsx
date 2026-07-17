import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { getPhotos, PHOTO_FEED_URL } from '@/lib/photos'

export const metadata: Metadata = {
  title: 'Photos — Gabriel Valdivia',
  description: 'Photographs by Gabriel Valdivia',
  alternates: {
    types: { 'application/feed+json': PHOTO_FEED_URL },
  },
}

export default async function PhotoPage() {
  const photos = await getPhotos()

  return (
    <section className="pb-20 tablet:pb-40">
      <Container>
        {photos.length === 0 ? (
          <p className="text-muted">No photos yet.</p>
        ) : (
          <div className="columns-1 tablet:columns-2 gap-5 space-y-5">
            {photos.map((photo) => (
              <Link
                key={photo.slug}
                href={`/photo/${photo.slug}`}
                className="block break-inside-avoid rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
              >
                <Image
                  src={photo.src}
                  alt=""
                  width={photo.width}
                  height={photo.height}
                  className="w-full h-auto"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </Link>
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
