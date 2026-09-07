type SourceTestimonial = {
  id?: string | number
  name?: string | null
  testimonial?: string | null
}

export function resolveHeroTestimonial({
  projectId,
  projectTitle,
  quoteOverride,
  nameOverride,
  source,
}: {
  projectId: string
  projectTitle: string
  quoteOverride?: string | null
  nameOverride?: string | null
  source?: SourceTestimonial | null
}) {
  const customQuote = quoteOverride?.trim() || ''
  const quote = customQuote || source?.testimonial
  if (!quote) return undefined

  return {
    id: customQuote ? `${projectId}-testimonial-override` : String(source?.id || `${projectId}-testimonial`),
    quote,
    name: nameOverride?.trim() || source?.name || projectTitle,
  }
}
