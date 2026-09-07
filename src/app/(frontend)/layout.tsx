import './globals.css'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { NavMenu } from '@/components/NavMenu'
import { SiteHeader, SiteHeaderFallback } from '@/components/SiteHeader'
import { Footer } from '@/components/Footer'
import { AgentationToolbar } from '@/components/AgentationToolbar'
import { OverlayManager } from '@/components/OverlayManager'
import { PageTransition } from '@/components/PageTransition'
import { getFooterSocialLinks, getNavigationPages, getSiteSettings } from '@/lib/queries'
import { normalizeSocialLink } from '@/lib/socialLinks'
import { SITE_ORIGIN, SITE_TAGLINE } from '@/lib/siteMetadata'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings() as any
  const title = settings?.siteTitle || 'Gabriel Valdivia'
  const description = settings?.siteDescription || SITE_TAGLINE
  return {
    title,
    description,
    metadataBase: new URL(settings?.canonicalUrl || SITE_ORIGIN),
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, footerLinks, navigationPages] = await Promise.all([
    getSiteSettings(),
    getFooterSocialLinks(),
    getNavigationPages(),
  ])

  const s = settings as any
  const contactLinks = footerLinks
    .filter((link): link is { platform: string; url: string } => Boolean(link.platform && link.url))
    .map(normalizeSocialLink)
  const emailLink = contactLinks.find((link: any) =>
    ['email', 'mail'].includes(link.platform?.toLowerCase()),
  )
  const footerEmail = emailLink?.url?.replace(/^mailto:/i, '') || 'gabe@valdivia.works'
  const footerSocialLinks = contactLinks
    .filter((link: any) => link !== emailLink)
    .slice(0, 4)

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {s?.googleAnalyticsId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.googleAnalyticsId}')` }} />
          </>
        )}
      </head>
      <body className="bg-background text-text-strong">
        <OverlayManager overlays={(s?.overlays as any[]) || []} />
        <NavMenu pages={navigationPages} />
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <PageTransition>{children}</PageTransition>
        <Footer email={footerEmail} socialLinks={footerSocialLinks} />
        <AgentationToolbar />
      </body>
    </html>
  )
}
