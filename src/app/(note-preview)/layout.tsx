import '../(frontend)/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Note preview — Gabriel Valdivia',
  robots: { index: false, follow: false, noarchive: true },
  referrer: 'no-referrer',
}

// Keep capability URLs and unpublished content out of the public analytics layout.
export default function NotePreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text-strong">{children}</body>
    </html>
  )
}
