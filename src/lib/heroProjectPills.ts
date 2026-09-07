/** Normalize only the editor's selection; an empty selection shows no pills. */
export function normalizeHeroPills(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const labels: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const label = item.trim()
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

/** Available suggestions, not automatic public content. */
export function getHeroProjectPills(project: { services?: unknown; client?: unknown }): string[] {
  const services = Array.isArray(project.services) ? project.services : []
  const client = project.client && typeof project.client === 'object' && 'tags' in project.client
    ? project.client
    : null
  const tags = Array.isArray(client?.tags) ? client.tags : []
  return normalizeHeroPills([
    ...services.map(service => service && typeof service === 'object' ? service.title : null),
    ...tags,
  ])
}
