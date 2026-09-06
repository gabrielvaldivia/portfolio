// Rewrite imported Note excerpts as concise, perspective-free summaries.
//
// Usage:
//   npx payload run scripts/neutralize-note-excerpts.ts -- --dry-run
//   npx payload run scripts/neutralize-note-excerpts.ts

import config from '@payload-config'
import { getPayload } from 'payload'

const isDryRun = process.argv.includes('--dry-run')

const excerptsBySlug: Record<string, string> = {
  'the-new-cost-of-creation': 'An exploration of how AI is changing creative work and blurring the line between creation and curation.',
  'i-built-a-second-brain-out-of-markdown-files': 'An account of building a flexible, adaptable knowledge-management system from markdown files.',
  'a-quilt-for-generations': 'A reflection on preserving family stories and traditions through tangible objects like quilts.',
  'software-is-an-instrument': 'A discussion of software as an instrument for creative expression, problem-solving, and human agency.',
  moves: 'A reflection on a lifetime of moving and what constant change reveals about impermanence, work, and adapting to an AI-disrupted world.',
  'the-gospel-of-design-founderhood': 'A satirical look at design founder culture, critiquing its emphasis on entrepreneurship and the commodification of design expertise.',
  'miles-traveled': 'An exploration of AI, design, and creativity through the lens of technology and human experience.',
  'the-startup-design-paradox': 'An examination of the creative and pragmatic tensions involved in building products from scratch.',
  'progress-over-polish': 'A case for prioritizing progress over perfection and embracing the rough edges of early-stage design.',
  'a-feeling-you-carry': 'An exploration of the emotional resonance of design and its connection to creativity and human experience.',
  'tomorrow-s-mirage': 'A critique of the hype around AI-generated design and a call for greater nuance and critical thinking.',
  'sleights-of-hand': 'An examination of the tricks used to sell AI-generated design and the limitations hidden beneath the spectacle.',
  'aimless-flow': 'An exploration of the tension between creative freedom and productivity when AI tools can both inspire and constrain expression.',
  'the-rise-of-the-product-planner': 'An examination of the emerging product planner role, where strategy and design converge in modern product development.',
  'digital-conquistadors': 'A reflection on the people shaping the digital landscape through products and experiences that transform industries.',
  'excuse-me-mister': 'An account of navigating cultural and professional differences at work and the role communication plays in bridging them.',
  'make-it-fun-chaos-in-product-design': 'Stories of product designers turning chaos into opportunity by embracing uncertainty, play, and creativity.',
  'leaders-are-liars': 'An examination of leadership, honesty, and the trust required to create positive change inside organizations.',
  'slowness-and-repetition': 'An exploration of the value of slowing down and embracing repetition in a culture that prizes speed and efficiency.',
  'figure-the-best-app-of-all-time': 'A reflection on Figure and the qualities that can make an app feel truly exceptional.',
  'dude-where-s-my-capitalism': 'A commentary on the changing nature of capitalism and technology’s effect on traditional economic systems.',
  'one-infinite-loop-from-johnny-castaway-to-steve-jobs': 'A connection between Johnny Castaway, Steve Jobs, and the evolution of personal technology.',
  'a-paella-of-experiences': 'A reflection on the value of human experience and the importance of preserving and sharing stories amid technological change.',
  'offsites-are-off-limits': 'A critique of traditional offsite meetings and the constraints they can place on creative thinking and collaboration.',
  'i-shouldn-t-do-this': 'An exploration of the tension between creation and curation and the role AI may play in shaping creative work.',
  'sensible-design-making-ethically-personalized-digital-products': 'A case for ethical personalization that considers the consequences of digital products for both users and society.',
  'embracing-public-design-discourse': 'A case for open design discourse as a way to strengthen ideas, practices, and the wider design community.',
  'blurred-lines': 'A reflection on the increasingly blurred boundary between creation and curation and what it means for designers and artists.',
  '8-little-tricks-to-grow-your-career': 'Eight practical strategies for growing a design career, from building relationships to sharing work publicly.',
  'wiki-chaves': 'A tribute to Wiki Chaves and the lasting influence of friendship, shared experiences, and creative partnership.',
  'michelle-morrison': 'A portrait of a creative collaboration shaped by shared ownership, trust, and the making of Vectors.',
  'luisa-mancera': 'An exploration of technology, human experience, and the empathy needed to design with greater understanding.',
  'analia-ibargoyen': 'A profile of Analía Ibargoyen and the challenge her perspective poses to assumptions about diversity and inclusion in design.',
  'immersive-design-the-next-10-years-of-interfaces': 'An exploration of immersive design and the technologies poised to reshape how people interact with interfaces.',
  'shipping-isnt-everything': 'An argument for valuing meaningful experiences over completion as the sole measure of successful design.',
  'diversity-is-punk-rock': 'A celebration of diversity and inclusion as forces for creative disruption in design.',
  'the-ux-of-virtual-identity-systems': 'An exploration of virtual identity systems and the empathy required to design for digital personas.',
  'designing-facebook-for-mobile-vr': 'A look at the challenges of designing Facebook for mobile VR, where virtual reality reshapes user expectations and behavior.',
  'four-design-lessons-learned-from-upgrading-the-panoramic-photo': 'Four lessons from redesigning panoramic photos, centered on simplicity, clarity, and user needs.',
  'identity-transfer-and-the-rise-of-virtual-surrealism': 'An examination of identity transfer and virtual surrealism as digital personas blur reality and fantasy.',
  'why-silicon-valley-loves-cuban-sandwiches': 'The story of Cuban sandwiches in Silicon Valley and the cultural and personal connections behind an unlikely tech-industry staple.',
  'an-ics-guide-to-being-a-good-design-manager': 'Practical guidance for individual contributors on collaboration, communication, and empathy in design management.',
  'interview-your-product-manager': 'A case for interviewing product managers to better understand the decisions and constraints shaping product development.',
  'a-peek-inside-part-1-impressions': 'A look inside a design team and the creative process that carries an idea toward a finished product.',
  'designing-happiness': 'An exploration of designing for happiness and creating products that bring genuine joy to people’s lives.',
  'the-wonder-years': 'A reflection on a designer’s formative years, early influences, career milestones, and an evolving industry.',
  'of-music-and-design': 'An examination of the relationship between music and design and how one creative practice can inform another.',
  'a-man-seeks-career-advice': 'The journey of a designer seeking career guidance while navigating the challenges and possibilities of a creative profession.',
  'the-journey-of-a-fragile-idea': 'The story of an impulsive design idea surviving the vulnerable journey from private sketch to shared product.',
  'device-aware-design': 'A case for products that respect each device’s native patterns instead of forcing one platform’s conventions onto another.',
}

const payload = await getPayload({ config })
const notes = await payload.find({
  collection: 'notes',
  depth: 0,
  draft: false,
  limit: 1000,
  overrideAccess: true,
  pagination: false,
  where: { _status: { equals: 'published' } },
})

const missingSummaries = notes.docs
  .filter((note) => !excerptsBySlug[note.slug])
  .map((note) => note.slug)

if (missingSummaries.length > 0) {
  throw new Error(`Missing neutral summaries for: ${missingSummaries.join(', ')}`)
}

const changedNotes = notes.docs.filter(
  (note) => note.excerpt !== excerptsBySlug[note.slug],
)

if (!isDryRun) {
  for (const note of changedNotes) {
    await payload.update({
      collection: 'notes',
      id: note.id,
      data: {
        _status: 'published',
        excerpt: excerptsBySlug[note.slug],
      },
      depth: 0,
      draft: false,
      overrideAccess: true,
    })
  }
}

console.log(JSON.stringify({
  dryRun: isDryRun,
  totalNotes: notes.totalDocs,
  updated: isDryRun ? 0 : changedNotes.length,
  wouldUpdate: changedNotes.length,
}, null, 2))

process.exit(0)
