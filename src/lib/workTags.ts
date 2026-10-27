export type WorkTag = { slug: string; label: string }

/** URL-safe key for a tag label, e.g. "Children Tech" → "children-tech". */
export function workTagSlug(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** A project's tags (edited per project in the admin), trimmed and deduplicated by slug. */
export function getProjectWorkTags(project: { tags?: unknown }): WorkTag[] {
  const values = Array.isArray(project.tags) ? project.tags : []
  const tags: WorkTag[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string') continue
    const label = value.trim()
    const slug = workTagSlug(label)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    tags.push({ slug, label })
  }
  return tags
}

/** Tags used by at least one of the given projects, alphabetical. */
export function collectWorkTags(projects: { tags: WorkTag[] }[]): WorkTag[] {
  const bySlug = new Map<string, WorkTag>()
  for (const project of projects) {
    for (const tag of project.tags) if (!bySlug.has(tag.slug)) bySlug.set(tag.slug, tag)
  }
  return [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/** Unknown or missing tags fall back to every project. */
export function filterProjectsByTag<T extends { tags: WorkTag[] }>(projects: T[], tag: string | null): T[] {
  if (!tag) return projects
  return projects.filter(project => project.tags.some(item => item.slug === tag))
}
