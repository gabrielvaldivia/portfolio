'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'
import { useReviewHref } from './ReviewNavigation'

export default function SiteLink({ href, as, ...props }: ComponentProps<typeof NextLink>) {
  const scope = useReviewHref()
  const scopedHref = typeof href === 'string'
    ? scope(href)
    : href.hostname || href.host || href.protocol
      ? href
      : { ...href, pathname: href.pathname ? scope(href.pathname) : href.pathname }
  const scopedAs = typeof as === 'string' ? scope(as) : as
  return <NextLink {...props} href={scopedHref} as={scopedAs} />
}

export function SiteAnchor({ href, ...props }: ComponentProps<'a'>) {
  const scope = useReviewHref()
  return <a {...props} href={href ? scope(href) : href} />
}
