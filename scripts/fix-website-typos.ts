// Preview: npx tsx scripts/fix-website-typos.ts --env /path/to/production.env
// Apply the reviewed text replacements: add --write.
// Backups and the change report are saved outside the repository.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import dotenv from 'dotenv'
import type { CollectionSlug } from 'payload'

type Replacement = { before: string; after: string; optional?: boolean }
type Target = { collection: CollectionSlug | 'timeline'; slug: string; fields: string[]; replacements: Replacement[] }
const targets: Target[] = [
  {
    "collection": "people",
    "slug": "Franck Chastagnol",
    "fields": [
      "testimonial"
    ],
    "replacements": [
      {
        "before": "identify clear next steps",
        "after": "identifying clear next steps"
      }
    ]
  },
  {
    "collection": "pages",
    "slug": "about",
    "fields": [
      "aboutSections",
      "interviews"
    ],
    "replacements": [
      {
        "before": "Dive Club 2023",
        "after": "Dive Club"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "assembler",
    "fields": [
      "subtitle",
      "description",
      "content",
      "meta"
    ],
    "replacements": [
      {
        "before": "dectector",
        "after": "detector"
      },
      {
        "before": "an experiment ran by",
        "after": "an experiment run by"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "twinsi",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "The home screen serves brings together",
        "after": "The home screen brings together"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "build-anything",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "with a polished app chassis, a memorable brand system",
        "after": "with a polished app chassis and a memorable brand system"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "dex",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "to create device shaped",
        "after": "to create a device shaped"
      },
      {
        "before": "pronounciation",
        "after": "pronunciation"
      },
      {
        "before": "an interactive systems",
        "after": "interactive systems"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "fb-360",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "The site instrumental",
        "after": "The site was instrumental"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "ritual",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "patient's oral microbiome results",
        "after": "patients’ oral microbiome results"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "tonic",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "articles to read everyday",
        "after": "articles to read every day"
      },
      {
        "before": "five articles that they wanted to read by adding it",
        "after": "five articles that they wanted to read by adding them"
      },
      {
        "before": "that, when tapped, it allows",
        "after": "that, when tapped, allows"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "shoebox",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "the podcast episodes that make it",
        "after": "the podcast episodes that make up the mixtape"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "grandstand",
    "fields": [
      "subtitle"
    ],
    "replacements": [
      {
        "before": "Sport fans communities",
        "after": "Sports fan communities"
      }
    ]
  },
  {
    "collection": "projects",
    "slug": "slingshot",
    "fields": [
      "description",
      "content",
      "subtitle",
      "meta"
    ],
    "replacements": [
      {
        "before": "a more stark speaking (light) and listening (dark) states",
        "after": "starker speaking (light) and listening (dark) states"
      }
    ]
  },
  {
    "collection": "side-projects",
    "slug": "gv-1",
    "fields": [
      "description",
      "richDescription",
      "content",
      "meta"
    ],
    "replacements": [
      {
        "before": "GV-1 Is a kinetic instrument",
        "after": "GV-1 is a kinetic instrument"
      }
    ]
  },
  {
    "collection": "side-projects",
    "slug": "venn",
    "fields": [
      "description"
    ],
    "replacements": [
      {
        "before": "Youtube",
        "after": "YouTube"
      }
    ]
  },
  {
    "collection": "side-projects",
    "slug": "fieldtone",
    "fields": [
      "description",
      "richDescription",
      "content",
      "meta"
    ],
    "replacements": [
      {
        "before": "Los Angeles at morning",
        "after": "Los Angeles in the morning"
      }
    ]
  },
  {
    "collection": "timeline",
    "slug": "timeline",
    "fields": [
      "chapters"
    ],
    "replacements": [
      {
        "before": "Scenario practice traditionally requirea",
        "after": "Scenario practice traditionally required"
      },
      {
        "before": "uniquely capable to provide",
        "after": "uniquely capable of providing"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "the-new-cost-of-creation",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "longer to create something that it takes",
        "after": "longer to create something than it takes"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "i-built-a-second-brain-out-of-markdown-files",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "X / Twitter ((via IFTTT",
        "after": "X / Twitter (via IFTTT"
      },
      {
        "before": "a previous complex data layer",
        "after": "a previously complex data layer"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "a-feeling-you-carry",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "Kardasians",
        "after": "Kardashians"
      },
      {
        "before": "Bratt Pit",
        "after": "Brad Pitt"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "tomorrow-s-mirage",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "more times that I can count",
        "after": "more times than I can count"
      },
      {
        "before": "thes talks",
        "after": "these talks"
      },
      {
        "before": "I’ve insisted to do so",
        "after": "I’ve insisted on doing so"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "the-rise-of-the-product-planner",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "we insist in bending",
        "after": "we insist on bending"
      },
      {
        "before": "despite of using",
        "after": "despite using"
      },
      {
        "before": "come in an inject",
        "after": "come in and inject"
      },
      {
        "before": "designerplanner",
        "after": "designer planner"
      },
      {
        "before": "(business) Or maybe",
        "after": "(business). Or maybe"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "digital-conquistadors",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "I’ve wore many masks",
        "after": "I’ve worn many masks"
      },
      {
        "before": "insist in creating",
        "after": "insist on creating"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "i-shouldn-t-do-this",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "insist in publishing",
        "after": "insist on publishing"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "slowness-and-repetition",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "I’ve ate before",
        "after": "I’ve eaten before"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "offsites-are-off-limits",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "anything other that popcorn",
        "after": "anything other than popcorn"
      },
      {
        "before": "michelin-star",
        "after": "Michelin-star"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "sensible-design-making-ethically-personalized-digital-products",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "newstands",
        "after": "newsstands"
      },
      {
        "before": "different kinds of reads everyday",
        "after": "different kinds of reads every day"
      },
      {
        "before": "japanese RPG archetypes",
        "after": "Japanese RPG archetypes"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "identity-transfer-and-the-rise-of-virtual-surrealism",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "ad naseum",
        "after": "ad nauseam"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "why-silicon-valley-loves-cuban-sandwiches",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "Linkedin",
        "after": "LinkedIn"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "immersive-design-the-next-10-years-of-interfaces",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "Javascript",
        "after": "JavaScript"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "a-man-seeks-career-advice",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "Wordpress",
        "after": "WordPress"
      },
      {
        "before": "Dribbble. .",
        "after": "Dribbble."
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "four-design-lessons-learned-from-upgrading-the-panoramic-photo",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "paired-down version",
        "after": "pared-down version"
      }
    ]
  },
  {
    "collection": "notes",
    "slug": "dude-where-s-my-capitalism",
    "fields": [
      "body",
      "excerpt",
      "meta"
    ],
    "replacements": [
      {
        "before": "asthe",
        "after": "as the"
      },
      {
        "before": "andcapitalism",
        "after": "and capitalism"
      },
      {
        "before": "agreat",
        "after": "a great"
      },
      {
        "before": "that'skeeping",
        "after": "that's keeping"
      },
      {
        "before": "ofthe",
        "after": "of the"
      },
      {
        "before": "trustfund",
        "after": "trust fund"
      },
      {
        "before": "belauded",
        "after": "be lauded"
      },
      {
        "before": "socialcache",
        "after": "social cachet"
      },
      {
        "before": "mypoint",
        "after": "my point"
      },
      {
        "before": "thatgroup",
        "after": "that group"
      },
      {
        "before": "neuve rich",
        "after": "nouveau riche"
      },
      {
        "before": "an american thing",
        "after": "an American thing"
      },
      {
        "before": "the USR",
        "after": "the USSR"
      },
      {
        "before": "occupation- centric",
        "after": "occupation-centric"
      }
    ]
  },
  {
    "collection": "pages",
    "slug": "home",
    "fields": [
      "sections"
    ],
    "replacements": [
      {
        "before": "in the Brooklyn, NY",
        "after": "in Brooklyn, NY"
      },
      {
        "before": "identify clear next steps",
        "after": "identifying clear next steps",
        "optional": true
      }
    ]
  }
]

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}
const envFile = argument('--env')
if (!envFile) throw new Error('Pass --env with the intended CMS environment file.')
dotenv.config({ path: envFile, override: true, quiet: true })
const write = process.argv.includes('--write')
const outputDirectory = argument('--output') || '/tmp/portfolio-typo-fixes'
await mkdir(outputDirectory, { recursive: true, mode: 0o700 })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
type Doc = Record<string, any>

function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(textOf).join('')
  if (value && typeof value === 'object') {
    const node = value as Doc
    if (node.type === 'text') return node.text || ''
    if (node.root) return textOf(node.root)
    if (node.children) return textOf(node.children)
    return Object.values(value).map(textOf).join('')
  }
  return ''
}

function correctFields(original: Doc, target: Target) {
  const hits = target.replacements.map(() => 0)
  const data: Doc = {}
  const walk = (value: any): any => {
    if (typeof value === 'string') {
      for (const [index, replacement] of target.replacements.entries()) {
        if (replacement.before === 'designerplanner') continue
        const parts = value.split(replacement.before)
        hits[index] += parts.length - 1
        value = parts.join(replacement.after)
      }
      return value
    }
    if (Array.isArray(value)) {
      return value.flatMap((child) => {
        const corrected = walk(child)
        const replacementIndex = target.replacements.findIndex((r) => r.before === 'designerplanner')
        if (replacementIndex >= 0 && corrected?.type === 'text' && corrected.text?.includes('designerplanner')) {
          const parts = corrected.text.split('designerplanner')
          hits[replacementIndex] += parts.length - 1
          const nodes: Doc[] = []
          parts.forEach((part: string, index: number) => {
            if (index) {
              nodes.push({ ...corrected, text: 'designer', format: (corrected.format || 0) | 4 })
              part = ` planner${part}`
            }
            if (part) nodes.push({ ...corrected, text: part })
          })
          return nodes
        }
        return [corrected]
      })
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key,
        ['id', 'url', 'src', 'slug', 'filename', 'apiKey'].includes(key) ? child : walk(child),
      ]))
    }
    return value
  }
  for (const field of target.fields) {
    const corrected = walk(original[field])
    if (!isDeepStrictEqual(original[field], corrected)) data[field] = corrected
  }
  const source = target.fields.map((field) => textOf(original[field])).join('\n')
  const checks = target.replacements.map((replacement, index) => ({
    ...replacement,
    count: hits[index],
    alreadyCorrect: !hits[index] && source.includes(replacement.after),
  }))
  return { data, checks }
}

async function readTarget(target: Target): Promise<Doc> {
  if (target.collection === 'timeline') return payload.findGlobal({ slug: 'timeline', depth: 0 })
  const result = await payload.find({
    collection: target.collection,
    where: { [target.collection === 'people' ? 'name' : 'slug']: { equals: target.slug } },
    depth: 0,
    limit: 1,
    draft: false,
    overrideAccess: true,
  })
  const doc = result.docs[0]
  if (!doc) throw new Error(`Missing ${target.collection}/${target.slug}`)
  return doc
}

try {
  const plans = []
  const missing = []
  const draftConflicts = []
  for (const target of targets) {
    const original = await readTarget(target)
    const { data, checks } = correctFields(original, target)
    let preservedDraft: Doc | undefined
    if (target.collection === 'notes') {
      const latest = await payload.findByID({ collection: 'notes', id: original.id, depth: 0, draft: true, overrideAccess: true })
      const publicFields = ['body', 'title', 'excerpt', 'slug', 'coverImage', 'meta', 'publishedAt', '_status']
      const differentFields = publicFields.filter((field) => !isDeepStrictEqual(original[field], (latest as Doc)[field]))
      if (differentFields.length === 1 && differentFields[0] === '_status' && latest._status === 'draft') {
        preservedDraft = latest
      } else if (differentFields.length) {
        draftConflicts.push({ slug: target.slug, differentFields, publishedStatus: original._status, latestStatus: latest._status })
        await writeFile(path.join(outputDirectory, `${target.slug}-versions.json`), JSON.stringify({ original, latest }, null, 2), { mode: 0o600 })
      }
    }
    for (const check of checks) {
      if (!check.count && !check.alreadyCorrect && !check.optional) missing.push({ target: target.slug, before: check.before })
    }
    plans.push({ target, original, data, checks, preservedDraft })
  }
  const summary = plans.map(({ target, original, data, checks, preservedDraft }) => ({
    collection: target.collection, slug: target.slug, id: original.id,
    fields: Object.keys(data), checks, preserveDraft: Boolean(preservedDraft),
  }))
  await writeFile(path.join(outputDirectory, 'plan.json'), JSON.stringify({ write, missing, draftConflicts, summary }, null, 2), { mode: 0o600 })
  if (draftConflicts.length) {
    console.log(JSON.stringify({ draftConflicts }, null, 2))
    throw new Error('Preserve unpublished changes before updating these notes.')
  }
  if (missing.length) {
    console.log(JSON.stringify({ missing }, null, 2))
    throw new Error('Some audited text has changed or spans formatting nodes. Inspect the plan before applying.')
  }
  if (write) {
    const backupFile = path.join(outputDirectory, `backup-${Date.now()}.json`)
    await writeFile(backupFile, JSON.stringify(plans.map(({ target, original, preservedDraft }) => ({ target, original, preservedDraft })), null, 2), { mode: 0o600 })
    for (const { target, original, data, preservedDraft } of plans) {
      if (!Object.keys(data).length) continue
      const fresh = await readTarget(target)
      if (fresh.updatedAt !== original.updatedAt || !isDeepStrictEqual(fresh, original)) {
        throw new Error(`${target.slug} changed after the preview; refusing to overwrite it.`)
      }
      if (target.collection === 'notes') {
        const latest = await payload.findByID({ collection: 'notes', id: original.id, depth: 0, draft: true, overrideAccess: true })
        const expected = preservedDraft || original
        for (const field of ['body', 'title', 'excerpt', 'slug', 'coverImage', 'meta', 'publishedAt', '_status']) {
          if (!isDeepStrictEqual((latest as Doc)[field], expected[field])) throw new Error(`${target.slug} gained draft edits during the preview.`)
        }
      }
      if (target.collection === 'timeline') {
        await payload.updateGlobal({ slug: 'timeline', data, depth: 0 })
      } else {
        await payload.update({ collection: target.collection, id: original.id, data: target.collection === 'notes' ? { ...data, _status: 'published' } : data, depth: 0, draft: false, overrideAccess: true, context: { skipNoteNewsletter: true } })
        if (preservedDraft) {
          await payload.update({ collection: 'notes', id: original.id, data: { ...data, _status: 'draft' }, depth: 0, draft: true, overrideAccess: true, context: { skipNoteNewsletter: true } })
        }
      }
      const saved = await readTarget(target)
      for (const field of Object.keys(data)) {
        if (!isDeepStrictEqual(saved[field], data[field])) throw new Error(`${target.slug}.${field} did not save exactly as expected.`)
      }
      if (target.collection === 'notes') {
        for (const field of ['title', 'slug', 'publishedAt', '_status', 'newsletterSentAt']) {
          if (!isDeepStrictEqual(saved[field], original[field])) throw new Error(`${target.slug}.${field} changed unexpectedly.`)
        }
      }
      console.log(`Verified ${target.collection}/${target.slug}`)
    }
  }
  console.log(JSON.stringify({
    write,
    documentsChecked: plans.length,
    documentsChanged: plans.filter((plan) => Object.keys(plan.data).length).length,
    replacements: plans.reduce((sum, plan) => sum + plan.checks.reduce((count, check) => count + check.count, 0), 0),
    alreadyCorrect: plans.reduce((sum, plan) => sum + plan.checks.filter((check) => check.alreadyCorrect).length, 0),
    plan: path.join(outputDirectory, 'plan.json'),
  }, null, 2))
} finally {
  await payload.destroy()
}
process.exit(0)
