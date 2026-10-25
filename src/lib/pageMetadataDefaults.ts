import type { Metadata } from 'next'
import { getSiteSettings } from './queries'

/**
 * A page's openGraph replaces the layout's whole object, so pages without
 * their own image would lose the site's default share image and name.
 */
export async function withSiteSocialDefaults(metadata: Metadata): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null) as {
    siteName?: string | null
    siteTitle?: string | null
    socialImage?: { url?: string | null } | null
  } | null
  const defaultImage = settings?.socialImage?.url || undefined
  const siteName = settings?.siteName || settings?.siteTitle || undefined
  const { openGraph, twitter } = metadata

  return {
    ...metadata,
    ...(openGraph ? {
      openGraph: {
        ...(siteName ? { siteName } : {}),
        ...(defaultImage ? { images: [{ url: defaultImage }] } : {}),
        ...openGraph,
      },
    } : {}),
    ...(twitter ? {
      twitter: {
        ...(defaultImage ? { images: [defaultImage] } : {}),
        ...twitter,
      },
    } : {}),
  }
}
