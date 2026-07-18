import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { ModuleLightboxProvider, ModuleLightboxTrigger, type ModuleLightboxSlide } from '@/components/ModuleLightbox'
import { getPhotos, PHOTO_FEED_URL, type Photo } from '@/lib/photos'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Photos — Gabriel Valdivia',
  description: 'Photographs by Gabriel Valdivia',
  alternates: {
    types: { 'application/feed+json': PHOTO_FEED_URL },
  },
}

function getPhotoSlideId(photo: Photo) {
  return `photo:${photo.slug}`
}

function getPhotoDateLabel(photo: Photo) {
  return new Date(photo.datePublished).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function getPhotoSlides(photos: Photo[]): ModuleLightboxSlide[] {
  return photos.map((photo) => ({
    id: getPhotoSlideId(photo),
    type: 'module',
    block: {
      blockType: 'image',
      image: { url: photo.src, width: photo.width, height: photo.height, alt: photo.alt },
      fit: 'contain',
    },
    label: 'Open photo fullscreen',
    photoInfo: {
      dateLabel: getPhotoDateLabel(photo),
      exif: photo.exif,
    },
    movableSurface: false,
  }))
}

export default async function PhotoPage() {
  const photos = await getPhotos()

  return (
    <section className="pb-20 tablet:pb-40">
      <Container>
        {photos.length === 0 ? (
          <p className="text-muted">No photos yet.</p>
        ) : (
          <ModuleLightboxProvider slides={getPhotoSlides(photos)}>
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 tablet:grid-cols-2 tablet:gap-y-10 desktop:grid-cols-3">
              {photos.map((photo) => (
                <ModuleLightboxTrigger
                  key={photo.slug}
                  slideId={getPhotoSlideId(photo)}
                  label="Open photo fullscreen"
                  fallbackAspectRatio={photo.width && photo.height ? photo.width / photo.height : undefined}
                  className="overflow-hidden rounded-md border border-border bg-background-alt"
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    className="h-auto w-full"
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                </ModuleLightboxTrigger>
              ))}
            </div>
          </ModuleLightboxProvider>
        )}
      </Container>
    </section>
  )
}
