import { getPayload } from './payload'

function extractText(richText: any): string {
  if (!richText) return ''
  if (typeof richText === 'string') return richText
  if (richText.root?.children) {
    return richText.root.children
      .map((node: any) => {
        if (node.type === 'paragraph' || node.type === 'heading') {
          return (node.children || []).map((c: any) => c.text || '').join('')
        }
        if (node.type === 'list') {
          return (node.children || [])
            .map((li: any) =>
              '- ' + (li.children || []).flatMap((p: any) => (p.children || []).map((c: any) => c.text || '')).join('')
            )
            .join('\n')
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

export type FAQItem = { question: string; answer: string }

export async function buildContext(): Promise<{ systemPrompt: string; faqItems: FAQItem[]; apiKey: string; model: string; gabosApiUrl: string }> {
  const payload = await getPayload()

  const [homePage, aboutPage, projectsResult, clientsResult, testimonialsResult, servicesResult, sideProjectsResult] =
    await Promise.all([
      payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, depth: 2, limit: 1 }),
      payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, depth: 2, limit: 1 }),
      payload.find({ collection: 'projects', sort: 'order', limit: 100, depth: 2 }),
      payload.find({ collection: 'clients', sort: 'order', limit: 100, depth: 1 }),
      payload.find({ collection: 'people', where: { featuredTestimonial: { equals: true } }, limit: 20, depth: 1 }),
      payload.find({ collection: 'services', sort: 'order', limit: 20 }),
      payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 2 }),
    ])

  const home = homePage.docs[0] as any
  const about = aboutPage.docs[0] as any
  const projects = projectsResult.docs as any[]
  const clients = clientsResult.docs as any[]
  const testimonials = testimonialsResult.docs as any[]
  const services = servicesResult.docs as any[]
  const sideProjects = sideProjectsResult.docs as any[]

  // Extract FAQ items and config from home sections
  const faqItems: FAQItem[] = []
  let apiKey = ''
  let model = ''
  let gabosApiUrl = ''
  let systemPromptExtra = ''
  const sections = (home?.sections || []) as any[]
  for (const section of sections) {
    if (section.blockType === 'accordion') {
      apiKey = section.apiKey || ''
      model = section.model || ''
      gabosApiUrl = section.gabosApiUrl || ''
      systemPromptExtra = section.systemPromptExtra || ''
      for (const item of section.items || []) {
        faqItems.push({
          question: item.question,
          answer: typeof item.answer === 'string' ? item.answer : extractText(item.answer),
        })
      }
    }
  }

  // Extract about text
  const aboutText = extractText(about?.bio)

  // Extract callout/availability
  let availability = ''
  let calloutText = ''
  for (const section of sections) {
    if (section.blockType === 'callout') {
      availability = section.availability || ''
      calloutText = extractText(section.text)
    }
  }

  // Extract about section from home
  let homeAboutText = ''
  for (const section of sections) {
    if (section.blockType === 'aboutSection') {
      homeAboutText = extractText(section.text)
    }
  }

  // Extract approach/numbered grid
  let approachItems: string[] = []
  for (const section of sections) {
    if (section.blockType === 'numberedGrid') {
      approachItems = (section.items || []).map((item: any) => extractText(item.text))
    }
  }

  // Build talks, interviews, patents
  const talks = (about?.talks || []) as any[]
  const interviews = (about?.interviews || []) as any[]
  const patents = (about?.patents || []) as any[]

  const systemPrompt = `You are Gabriel Valdivia's portfolio assistant. You speak in first person as if you ARE Gabriel — warm, direct, and friendly. Answer questions using ONLY the information below. If something isn't covered, say "I don't have that information on my site, but feel free to email me at gabe@valdivia.works and I'll get back to you."

## About Gabriel
${homeAboutText}

${aboutText ? `## Full Bio\n${aboutText}` : ''}

## Services & Capabilities
${services.map((s) => s.title).join(', ')}

${approachItems.length ? `## Approach\n${approachItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}` : ''}

## Featured Projects
${projects
  .filter((p) => p.featured)
  .map((p) => {
    const client = typeof p.client === 'object' ? p.client?.name : ''
    const projectServices = (p.services || []).map((s: any) => (typeof s === 'object' ? s.title : '')).filter(Boolean)
    return `- ${p.title}${client ? ` (${client})` : ''}${p.subtitle ? `: ${p.subtitle}` : ''}${p.year ? ` [${p.year}]` : ''}${projectServices.length ? ` — ${projectServices.join(', ')}` : ''}`
  })
  .join('\n')}

## All Projects
${projects.map((p) => `- ${p.title}${p.subtitle ? `: ${p.subtitle}` : ''}`).join('\n')}

## Clients
${clients.map((c) => c.name).join(', ')}

## Testimonials
${testimonials.map((t) => `"${t.testimonial}" — ${t.name}, ${t.role}${t.company ? ` at ${t.company}` : ''}`).join('\n\n')}

${talks.length ? `## Talks\n${talks.map((t) => `- ${t.title} at ${t.event}${t.year ? ` (${t.year})` : ''}`).join('\n')}` : ''}

${interviews.length ? `## Interviews\n${interviews.map((t) => `- ${t.title} — ${t.event}${t.year ? ` (${t.year})` : ''}`).join('\n')}` : ''}

${patents.length ? `## Patents\n${patents.map((p) => `- ${p.title}`).join('\n')}` : ''}

${sideProjects.length ? `## Side Projects (Playground)\n${sideProjects.map((p) => `- ${p.title}${p.description ? `: ${p.description}` : ''}`).join('\n')}` : ''}

## FAQs
${faqItems.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

## Contact
- Email: gabe@valdivia.works
- Availability: ${availability || 'Check the site for current availability'}
${calloutText ? `- ${calloutText}` : ''}

## Blog & Writing
You have access to Gabriel's blog posts and tweets via tools. When the user asks about your opinions, writing, thoughts on a topic, or anything that might be covered in a blog post or tweet, use the search_writing tool to find relevant posts. Then use read_post to get the full content if needed.

## Important Rules
- Answer in first person (I, me, my) since you represent Gabriel directly
- Keep responses concise — 2-3 sentences when possible
- IMPORTANT: Split longer responses into short paragraphs separated by double newlines. Each paragraph should be 1-2 sentences max. This makes the response feel like a natural text conversation with multiple chat bubbles.
- Be warm and conversational, like texting a friend
- NEVER use markdown formatting (no **, no *, no #, no []() links). Write plain text only.
- When mentioning a project, use its exact title as listed above (e.g. "Dex Camera" not "**Dex Camera**")
- When someone asks about working together or hiring, mention the email and current availability
- You can reference specific projects, clients, and testimonials when relevant
- CRITICAL: When referencing a blog post or tweet, you MUST use [Title](url) format so the title becomes a clickable link. Example: "I wrote about this in [The Startup Design Paradox](https://unkempt.substack.com/p/the-startup-design-paradox)". NEVER put a bare URL next to the title. NEVER omit the URL. ALWAYS wrap the title in [brackets](with the url). This is the ONE exception to the no-markdown rule.
- Never make up information that isn't provided above or returned by tools
${systemPromptExtra ? `\n## Additional Instructions\n${systemPromptExtra}` : ''}`

  return { systemPrompt, faqItems, apiKey, model, gabosApiUrl }
}
