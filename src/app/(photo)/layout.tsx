import '../(frontend)/globals.css'

export default function PhotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-content">{children}</body>
    </html>
  )
}
