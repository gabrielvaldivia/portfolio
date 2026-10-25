import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/queries'
import { SITE_ORIGIN, SITE_TAGLINE } from '@/lib/siteMetadata'

/** Site-wide metadata shared by every root layout. */
export async function generateSiteMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings() as any
  const title = settings?.siteTitle || 'Gabriel Valdivia'
  const description = settings?.siteDescription || SITE_TAGLINE
  return {
    title,
    description,
    metadataBase: new URL(settings?.canonicalUrl || SITE_ORIGIN),
    authors: [{ name: 'Gabriel Valdivia', url: '/about' }],
    creator: 'Gabriel Valdivia',
    publisher: 'Gabriel Valdivia',
    ...(settings?.noIndex ? { robots: { index: false, follow: false } } : {}),
    icons: {
      icon: settings?.favicon?.url || undefined,
      apple: settings?.appleTouchIcon?.url || undefined,
    },
    openGraph: {
      title,
      siteName: settings?.siteName || title,
      description,
      images: settings?.socialImage?.url ? [{ url: settings.socialImage.url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: settings?.socialImage?.url ? [settings.socialImage.url] : undefined,
    },
  }
}
