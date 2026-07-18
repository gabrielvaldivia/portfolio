export const THREADS_URL = 'https://www.threads.com/@gabrielvaldivia'

export function normalizeSocialLink<T extends { platform?: string | null; url?: string | null }>(link: T) {
  const platform = link.platform?.toLowerCase().replace(/[^a-z]/g, '')

  if (platform === 'instagram' || platform === 'threads') {
    return { ...link, platform: 'Threads', url: THREADS_URL }
  }

  return link
}
