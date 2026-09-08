'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-[700px] flex-col items-start justify-center px-5 py-32 tablet:px-10">
      <p className="text-caption text-text-muted">Something went wrong</p>
      <h1 className="mt-4 text-balance text-[44px] leading-[1.05] tablet:text-h2">That page didn’t load.</h1>
      <p className="mt-5 max-w-[520px] text-body text-text-body">
        This may be temporary. Try loading it again.
      </p>
      <button className="mt-8 cursor-pointer underline underline-offset-4" type="button" onClick={retry}>
        Try again
      </button>
    </main>
  )
}
