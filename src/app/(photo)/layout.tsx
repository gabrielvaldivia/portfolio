import '../(frontend)/globals.css'
import { AgentationToolbar } from '@/components/AgentationToolbar'

// A separate root layout, so reuse the site's icons, base URL, and noindex setting.
export { generateSiteMetadata as generateMetadata } from '@/lib/siteLayoutMetadata'

export default function PhotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-text-strong">
        {children}
        <AgentationToolbar />
      </body>
    </html>
  )
}
