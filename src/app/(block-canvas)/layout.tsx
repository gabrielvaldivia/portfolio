import '../(frontend)/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Content editor — Gabriel Valdivia',
  robots: { index: false, follow: false, noarchive: true },
}

// The admin frames this page; it shows only what the editor sends it, without the site chrome.
export default function BlockCanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text-strong">{children}</body>
    </html>
  )
}
