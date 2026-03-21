import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { getNavigation, getSiteSettings } from '@/lib/queries'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Gabriel Valdivia',
  description: 'Fractional Design Partner for Early-Stage Teams',
}

export const revalidate = 60

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [navigation, settings] = await Promise.all([getNavigation(), getSiteSettings()])

  const navItems = (navigation?.items || []).map((item: any) => ({
    label: item.label,
    url: item.url,
    newTab: item.newTab,
  }))

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-content">
        <Nav items={navItems} />
        <main>{children}</main>
        <Footer copyright={settings?.copyright} />
      </body>
    </html>
  )
}
