import Link from 'next/link'

export default function PhotoNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[700px] flex-col items-start justify-center px-5 py-20 tablet:px-10">
      <p className="text-caption text-text-muted">404</p>
      <h1 className="mt-4 text-balance text-[44px] leading-[1.05] tablet:text-h2">That photo isn’t here.</h1>
      <Link className="mt-8 underline underline-offset-4" href="/photos">View all photos</Link>
    </main>
  )
}
