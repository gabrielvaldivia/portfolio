export const REVIEW_PATH = '/dive'

export function isReviewPath(pathname: string) {
  return pathname === REVIEW_PATH || pathname.startsWith(`${REVIEW_PATH}/`)
}

export function publicPathname(pathname: string) {
  return isReviewPath(pathname) ? pathname.slice(REVIEW_PATH.length) || '/' : pathname
}

/** Scope page links only; preserve downloads, API calls, fragments, and external URLs. */
export function reviewHref(href: string, enabled = true) {
  if (!enabled || !href || href.startsWith('#') || href.startsWith('?')) return href
  let path = href
  if (/^(?:https?:)?\/\//i.test(href)) {
    const url = new URL(href, 'https://www.gabrielvaldivia.com')
    if (!['gabrielvaldivia.com', 'www.gabrielvaldivia.com'].includes(url.hostname)) return href
    path = `${url.pathname}${url.search}${url.hash}`
  } else if (!href.startsWith('/')) {
    return href
  }
  const pathname = path.split(/[?#]/, 1)[0]
  if (isReviewPath(pathname) || /^\/(?:api|admin|_next|images|media|fonts)(?:\/|$)/.test(pathname) || /\.[^/]+$/.test(pathname)) return href
  return `${REVIEW_PATH}${pathname === '/' ? path.slice(1) : path}`
}
