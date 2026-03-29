import './globals.css'
import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { OverlayManager } from '@/components/OverlayManager'
import { getNavigation, getSiteSettings } from '@/lib/queries'

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
  const [navigation, settings] = await Promise.all([getNavigation(), getSiteSettings()])

  const s = settings as any

  const navItems = (navigation?.items || []).map((item: any) => ({
    label: item.label,
    url: item.url,
    newTab: item.newTab,
  }))

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {s?.googleAnalyticsId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.googleAnalyticsId}')` }} />
          </>
        )}
      </head>
      <body className="bg-background text-content">
        <OverlayManager overlays={(s?.overlays as any[]) || []} />
        <Nav items={navItems} />
        <main>{children}</main>
        <Footer copyright={(navigation as any)?.copyright} />
      </body>
    </html>
  )
}
