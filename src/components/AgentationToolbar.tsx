'use client'

import { Agentation } from 'agentation'
import { useEffect, useState } from 'react'

export function AgentationToolbar() {
  const [endpoint, setEndpoint] = useState<string>()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const controller = new AbortController()
    const localEndpoint = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || 'http://localhost:4747'

    fetch(`${localEndpoint}/health`, { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (response.ok) {
          setEndpoint(localEndpoint)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <style>{`
        [data-annotation-popup] textarea {
          background: #ffffff !important;
          color: #111111 !important;
          -webkit-text-fill-color: #111111;
          caret-color: #111111;
        }

        [data-annotation-popup] textarea::placeholder {
          color: rgba(17, 17, 17, 0.45) !important;
          -webkit-text-fill-color: rgba(17, 17, 17, 0.45);
        }

        [data-annotation-popup] textarea::selection {
          background: rgba(0, 122, 255, 0.28);
          color: #111111;
          -webkit-text-fill-color: #111111;
        }
      `}</style>
      <Agentation endpoint={endpoint} />
    </>
  )
}
