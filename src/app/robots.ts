import type { MetadataRoute } from 'next'
import { getSiteSettings } from '@/lib/queries'
import { SITE_ORIGIN } from '@/lib/siteMetadata'

export const revalidate = 60

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings() as { canonicalUrl?: string | null; noIndex?: boolean | null }
  const origin = (settings.canonicalUrl || SITE_ORIGIN).replace(/\/$/, '')

  if (settings.noIndex) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      host: origin,
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
