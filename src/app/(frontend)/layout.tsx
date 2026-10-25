import './globals.css'
import './home.css'
import { PortfolioLayout } from '@/components/PortfolioLayout'

export const revalidate = 3600

export { generateSiteMetadata as generateMetadata } from '@/lib/siteLayoutMetadata'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <PortfolioLayout>{children}</PortfolioLayout>
}
