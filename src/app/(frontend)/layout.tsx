import './globals.css'
import type { Metadata } from 'next'
import { NavMenu } from '@/components/NavMenu'
import { SiteHeader } from '@/components/SiteHeader'
import { Footer } from '@/components/Footer'
import { AgentationToolbar } from '@/components/AgentationToolbar'
import { OverlayManager } from '@/components/OverlayManager'
import { PageTransition } from '@/components/PageTransition'
import { getPageBySlug, getSiteSettings } from '@/lib/queries'
import { normalizeSocialLink } from '@/lib/socialLinks'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings() as any
  const title = settings?.siteTitle || 'Gabriel Valdivia'
  const description = settings?.siteDescription || 'Fractional Design Partner for Early-Stage Teams'
  return {
    title,
    description,
    ...(settings?.canonicalUrl ? { metadataBase: new URL(settings.canonicalUrl) } : {}),
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
  const [settings, homePage] = await Promise.all([
    getSiteSettings(),
    getPageBySlug('home'),
  ])

  const s = settings as any
  const contactBlock = ((homePage as any)?.sections || []).find(
    (section: any) => section.blockType === 'socialLinks',
  )
  const contactLinks = ((contactBlock?.links || []) as any[]).map(normalizeSocialLink)
  const emailLink = contactLinks.find((link: any) =>
    ['email', 'mail'].includes(link.platform?.toLowerCase()),
  )
  const footerEmail = emailLink?.url?.replace(/^mailto:/i, '') || 'gabe@valdivia.works'
  const footerSocialLinks = contactLinks
    .filter((link: any) => link !== emailLink)
    .slice(0, 4)

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          .page-transition { opacity: 0; transform: translateY(12px); }
        ` }} />
        {s?.googleAnalyticsId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.googleAnalyticsId}')` }} />
          </>
        )}
      </head>
      <body className="bg-background text-content">
        <OverlayManager overlays={(s?.overlays as any[]) || []} />
        <NavMenu />
        <SiteHeader />
        <PageTransition>{children}</PageTransition>
        <Footer email={footerEmail} socialLinks={footerSocialLinks} />
        <AgentationToolbar />
      </body>
    </html>
  )
}
