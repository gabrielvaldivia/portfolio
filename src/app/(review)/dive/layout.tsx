import '../../(frontend)/globals.css'
import '../../(frontend)/home.css'
import type { Metadata } from 'next'
import { PortfolioLayout } from '@/components/PortfolioLayout'
import { generateMetadata as siteMetadata } from '../../(frontend)/layout'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...await siteMetadata(),
    title: 'Gabriel Valdivia — Dive Club review',
    robots: { index: false, follow: false },
  }
}

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <PortfolioLayout review>{children}</PortfolioLayout>
}
