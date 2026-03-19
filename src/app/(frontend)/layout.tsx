import './globals.css'
import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { getNavigation, getSiteSettings } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Gabriel Valdivia',
  description: 'Fractional Design Partner for Early-Stage Teams',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [navigation, settings] = await Promise.all([getNavigation(), getSiteSettings()])

  const navItems = (navigation?.items || []).map((item: any) => ({
    label: item.label,
    url: item.url,
    newTab: item.newTab,
  }))

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-content">
        <Nav items={navItems} />
        <main>{children}</main>
        <Footer copyright={settings?.copyright} />
      </body>
    </html>
  )
}
