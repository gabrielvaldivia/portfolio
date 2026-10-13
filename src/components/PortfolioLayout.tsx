import { Suspense } from 'react'
import { NavMenu } from '@/components/NavMenu'
import { SiteHeader, SiteHeaderFallback } from '@/components/SiteHeader'
import { Footer } from '@/components/Footer'
import { AgentationToolbar } from '@/components/AgentationToolbar'
import { OverlayManager } from '@/components/OverlayManager'
import { PageTransition } from '@/components/PageTransition'
import { getFooterSocialLinks, getNavigationPages, getSiteSettings } from '@/lib/queries'
import { normalizeSocialLink } from '@/lib/socialLinks'
import { SITE_ORIGIN } from '@/lib/siteMetadata'

import { ReviewNavigation } from '@/components/ReviewNavigation'

export async function PortfolioLayout({ children, review = false }: { children: React.ReactNode; review?: boolean }) {
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

  const content = (
    <>
      <OverlayManager overlays={(s?.overlays as any[]) || []} />
      <NavMenu pages={navigationPages} />
      <Suspense fallback={<SiteHeaderFallback />}><SiteHeader /></Suspense>
      <PageTransition>{children}</PageTransition>
      <Footer email={footerEmail} socialLinks={footerSocialLinks} />
      <AgentationToolbar />
    </>
  )

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {review && <script src="https://inflight.co/widget.js" data-org="aius9qpt" data-path="/dive" async />}
        <link rel="describedby" href="/llms.txt" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Gabriel Valdivia — Notes"
          href={new URL('/notes/rss.xml', s?.canonicalUrl || SITE_ORIGIN).toString()}
        />
        {s?.googleAnalyticsId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.googleAnalyticsId}')` }} />
          </>
        )}
      </head>
      <body className="bg-background text-text-strong">
        {review ? <ReviewNavigation>{content}</ReviewNavigation> : content}
      </body>
    </html>
  )
}
