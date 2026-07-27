import Image from 'next/image'
import { Container } from '@/components/Container'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { ModuleLightboxProvider, ModuleLightboxTrigger, type ModuleLightboxSlide } from '@/components/ModuleLightbox'
import { getPhotoLikeTargetId } from '@/lib/moduleLikes'
import { getPhotos, type Photo } from '@/lib/photos'

function getPhotoSlideId(photo: Photo) {
  return getPhotoSlideIdFromSlug(photo.slug)
}

function getPhotoSlideIdFromSlug(slug: string) {
  return `photo:${slug}`
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
    likeTargetId: getPhotoLikeTargetId(photo.slug),
    photoInfo: {
      dateLabel: getPhotoDateLabel(photo),
      exif: photo.exif,
    },
    zoomablePhoto: true,
    movableSurface: false,
  }))
}

function getInitialSlideId(photos: Photo[], slug?: string | null) {
  if (!slug || !photos.some((photo) => photo.slug === slug)) return undefined
  return getPhotoSlideIdFromSlug(slug)
}

export async function PhotoGallery({ initialPhotoSlug }: { initialPhotoSlug?: string | null }) {
  const photos = await getPhotos()
  const initialSlideId = getInitialSlideId(photos, initialPhotoSlug)

  return (
    <section className="pb-20 tablet:pb-40">
      <Container>
        {photos.length === 0 ? (
          <p className="text-muted">No photos yet.</p>
        ) : (
          <ModuleLightboxProvider slides={getPhotoSlides(photos)} initialSlideId={initialSlideId}>
            <div className="columns-1 gap-5 tablet:columns-2 desktop:columns-3">
              {photos.map((photo) => (
                <div key={photo.slug} className="group/photo relative mb-5 inline-block w-full break-inside-avoid tablet:mb-10">
                  <ModuleLightboxTrigger
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
                  <div className="absolute bottom-3 left-3 z-20 opacity-100 transition-opacity duration-150 desktop:pointer-events-none desktop:opacity-0 desktop:group-hover/photo:pointer-events-auto desktop:group-hover/photo:opacity-100 desktop:group-focus-within/photo:pointer-events-auto desktop:group-focus-within/photo:opacity-100">
                    <LazyModuleLikeButton targetId={getPhotoLikeTargetId(photo.slug)} />
                  </div>
                </div>
              ))}
            </div>
          </ModuleLightboxProvider>
        )}
      </Container>
    </section>
  )
}
