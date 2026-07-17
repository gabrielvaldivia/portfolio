import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { ModuleLightboxProvider, ModuleLightboxTrigger, type ModuleLightboxSlide } from '@/components/ModuleLightbox'
import { getPhotos, PHOTO_FEED_URL, type Photo } from '@/lib/photos'

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

function getPhotoSlides(photos: Photo[]): ModuleLightboxSlide[] {
  return photos.map((photo) => ({
    id: getPhotoSlideId(photo),
    type: 'module',
    block: {
      blockType: 'image',
      image: { url: photo.src, width: photo.width, height: photo.height, alt: '' },
      fit: 'contain',
    },
    label: 'Open photo fullscreen',
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
            <div className="columns-1 tablet:columns-2 gap-5 space-y-5">
              {photos.map((photo) => (
                <ModuleLightboxTrigger
                  key={photo.slug}
                  slideId={getPhotoSlideId(photo)}
                  label="Open photo fullscreen"
                  fallbackAspectRatio={photo.width && photo.height ? photo.width / photo.height : undefined}
                  className="break-inside-avoid rounded-lg overflow-hidden"
                >
                  <Image
                    src={photo.src}
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    className="w-full h-auto"
                    sizes="(min-width: 768px) 50vw, 100vw"
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
