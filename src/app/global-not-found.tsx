import Link from 'next/link'
import './(frontend)/globals.css'

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="bg-background text-text-strong">
        <main className="mx-auto flex min-h-dvh w-full max-w-[700px] flex-col items-start justify-center px-5 py-20 tablet:px-10">
          <title>Page not found — Gabriel Valdivia</title>
          <p className="text-caption text-text-muted">404</p>
          <h1 className="mt-4 text-balance text-[44px] leading-[1.05] tablet:text-h2">This page wandered off.</h1>
          <p className="mt-5 max-w-[520px] text-body text-text-body">
            The address may have changed, or the page may no longer exist.
          </p>
          <Link className="mt-8 underline underline-offset-4" href="/">Return home</Link>
        </main>
      </body>
    </html>
  )
}
