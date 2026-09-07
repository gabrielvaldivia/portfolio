/** Reuse authored project capabilities and client industry tags, never relation IDs. */
export function getHeroProjectPills(project: { services?: unknown; client?: unknown }): string[] {
  const services = Array.isArray(project.services) ? project.services : []
  const client = project.client && typeof project.client === 'object' && 'tags' in project.client
    ? project.client
    : null
  const tags = Array.isArray(client?.tags) ? client.tags : []
  const labels: string[] = []
  const seen = new Set<string>()

  for (const value of [
    ...services.map(service => service && typeof service === 'object' ? service.title : null),
    ...tags,
  ]) {
    if (typeof value !== 'string') continue
    const label = value.trim()
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }

  return labels
}
