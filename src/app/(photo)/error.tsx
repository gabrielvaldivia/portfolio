'use client'

import { useEffect } from 'react'

export default function PhotoError({
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
    <main className="mx-auto flex min-h-dvh w-full max-w-[700px] flex-col items-start justify-center px-5 py-20 tablet:px-10">
      <p className="text-caption text-text-muted">Something went wrong</p>
      <h1 className="mt-4 text-balance text-[44px] leading-[1.05] tablet:text-h2">The photos didn’t load.</h1>
      <button className="mt-8 cursor-pointer underline underline-offset-4" type="button" onClick={retry}>
        Try again
      </button>
    </main>
  )
}
