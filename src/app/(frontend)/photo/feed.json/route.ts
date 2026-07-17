import { getPhotos, SITE_URL, PHOTO_FEED_URL } from '@/lib/photos'

export const dynamic = 'force-static'

export async function GET() {
  const photos = await getPhotos()

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Gabriel Valdivia — Photos',
    home_page_url: `${SITE_URL}/photo/`,
    feed_url: PHOTO_FEED_URL,
    authors: [
      {
        name: 'Gabriel Valdivia',
        url: SITE_URL,
        avatar: `${SITE_URL}/avatar.jpg`,
      },
    ],
    _photoring: { ring: 'openfeed-demo', creator: 'gabrielvaldivia' },
    items: photos.map((photo) => {
      const permalink = `${SITE_URL}/photo/${photo.slug}/`
      const exif = Object.fromEntries(
        Object.entries(photo.exif).filter(([, value]) => value != null),
      )
      return {
        id: permalink,
        url: permalink,
        image: `${SITE_URL}${photo.src}`,
        date_published: photo.datePublished,
        ...(Object.keys(exif).length > 0 ? { _photoring: { exif } } : {}),
      }
    }),
  }

  return Response.json(feed, {
    headers: { 'content-type': 'application/feed+json; charset=utf-8' },
  })
}
