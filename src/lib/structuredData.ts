import { SITE_ORIGIN, SITE_TAGLINE } from './siteMetadata'

type JsonLdNode = Record<string, unknown>

export const PERSON_ID_PATH = '/#gabriel-valdivia'
export const WEBSITE_ID_PATH = '/#website'

export function normalizeSiteOrigin(origin = SITE_ORIGIN) {
  return origin.replace(/\/$/, '')
}

export function absoluteSiteUrl(path = '/', origin = SITE_ORIGIN) {
  return new URL(path, `${normalizeSiteOrigin(origin)}/`).toString()
}

export function personReference(origin = SITE_ORIGIN) {
  return { '@id': absoluteSiteUrl(PERSON_ID_PATH, origin) }
}

export function websiteReference(origin = SITE_ORIGIN) {
  return { '@id': absoluteSiteUrl(WEBSITE_ID_PATH, origin) }
}

export function buildSiteStructuredData(nodes: JsonLdNode[], origin = SITE_ORIGIN) {
  const normalizedOrigin = normalizeSiteOrigin(origin)
  const personId = absoluteSiteUrl(PERSON_ID_PATH, normalizedOrigin)
  const websiteId = absoluteSiteUrl(WEBSITE_ID_PATH, normalizedOrigin)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: 'Gabriel Valdivia',
        url: absoluteSiteUrl('/about', normalizedOrigin),
        image: absoluteSiteUrl('/avatar.jpg', normalizedOrigin),
        description: SITE_TAGLINE,
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: absoluteSiteUrl('/', normalizedOrigin),
        name: 'Gabriel Valdivia',
        description: SITE_TAGLINE,
        inLanguage: 'en-US',
        creator: { '@id': personId },
      },
      ...nodes,
    ],
  }
}

export function compactJsonLdValues<T>(values: Array<T | null | undefined | false>): T[] {
  return values.filter((value): value is T => Boolean(value))
}
