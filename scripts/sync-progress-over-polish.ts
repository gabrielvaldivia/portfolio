// Restore the full body of the Progress Over Polish note from its original
// Unkempt publication. The existing title, excerpt, date, and status are kept.
//
// Usage:
//   npx payload run scripts/sync-progress-over-polish.ts -- --dry-run
//   npx payload run scripts/sync-progress-over-polish.ts

import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'
import config from '@payload-config'
import { getPayload } from 'payload'

const slug = 'progress-over-polish'
const sourceURL = 'https://unkempt.substack.com/p/progress-over-polish'
const isDryRun = process.argv.includes('--dry-run')

const markdown = `How fast decisions lead to better outcomes

Early-stage startups thrive on momentum. They don’t yet know who they are, what their customers want, or which direction their product should take. Slack started as [a video game](https://techcrunch.com/2019/05/30/the-slack-origin-story/), Instagram began as [a check-in app](https://www.theatlantic.com/technology/archive/2014/07/instagram-used-to-be-called-brbn/373815/), and Twitter was originally [a podcasting platform](https://en.wikipedia.org/wiki/History_of_Twitter). These products didn’t start out as the polished, successful tools we know today, but by rapidly testing and adapting, they found their true value. The path to success is rarely a straight line, and progress doesn’t come from making good decisions—it comes from making decisions *quickly*.

In my experience, good decisions rarely happen in isolation. They come after working through bad decisions, iterating, and refining. The faster a team can get through the early missteps, the faster they can uncover what works. This is why momentum is so critical: every decision, no matter how imperfect, helps build the foundation for what’ next.

This approach might remind you of the MVP, which has become a familiar buzzword over the last decade. While we’ve all gotten good at quoting the Lean Startup, we’ve often overlooked its most crucial element: speed. If it takes six months to ship your MVP, you’re already behind. “Progress over polish” flips the script by pushing you to compress timelines. Instead of taking six months, ask yourself: what can you ship in six weeks, six days, or even six hours?

This mindset has fundamentally reshaped the way I view the value of design. In the past, I often saw design as something that had to be refined and polished to perfection, a precious artifact that could stand the test of time. But I’ve come to realize that Product Design is a living organism and the best designs aren’t necessarily the most polished or perfect—they’re the ones that spark progress. They act as conversation-starters or tie-breakers, giving teams something tangible to react to, iterate on, and build from. They create a moment of clarity that allows everyone to move forward with confidence.

Don’t get me wrong, I’m a big fan of high-fidelity prototypes—they’re a powerful tool when used at the right time. But in a startup environment, they’re a luxury that comes with experience—the kind of experience that lets you deliver them quickly and efficiently. Until you reach that level, your designs should match the fidelity that allows you to move fast. Speed shouldn’t be sacrificed in the pursuit of high fidelity.

Fast design introduces an abundance mindset that changes the question from “Should we do this or this?” to “Let’s do this *and* this.” It’s about finding ways to move things forward instead of getting stuck in an endless cycle of debate. This mindset shift creates a culture of experimentation. It tells the team that not only is progress possible, but there’s always room for more solutions, more ideas, and more opportunities. It removes the fear of making the wrong choice and opens up space for innovation to flourish.

In this light, design becomes a catalyst, a tool for generating movement, not just for creating static assets. It becomes less about the artifact itself and more about what that artifact enables: conversations, action, learning, and growth. And that, I believe, is where design really earns its value: when it helps teams break through uncertainty and move toward something greater.

This is why startups benefit from experienced designers who can quickly navigate past the bad ideas and land on something sensible from the start. With experience comes the ability to make informed decisions faster. Unlike less seasoned designers, someone with a few battle scars brings the skill and agility needed to deliver a strong first iteration that sets the team up for success.

This mindset, of prioritizing progress over polish, has not only reshaped my approach to design but has also been influenced by an unexpected source—parenting. Watching my son explore the world, I’ve realized that my role as a parent isn’t to control his every move or impose a specific way of doing things. Instead, it’s to create an environment where he can discover his own path. I can’t dictate how or when he learns, but I can give him the space to experiment, make mistakes, and figure things out. The more I allow him to find his way, the more he grows—and the more I learn how to be a better guide.

This idea also applies to my work as a designer. Just as I don’t impose rigid solutions on my son, I don’t try to force a “perfect” answer on my clients. My role is to help them navigate uncertainty by creating conditions that allow for experimentation and learning. Much like a child’s development, the path to product-market fit and effective design isn’t always linear. By encouraging quick decisions, embracing mistakes, and fostering continuous feedback, I help my clients move forward and refine their solutions faster.

In both cases, the goal is the same: to foster an environment where growth thrives through experimentation and learning. The focus isn’t on delivering a perfect design right away, but on using design as a tool to guide the journey toward a better solution, trusting that with each step, the right solution will emerge.`

const payload = await getPayload({ config })
const result = await payload.find({
  collection: 'notes',
  where: { slug: { equals: slug } },
  depth: 0,
  draft: false,
  limit: 1,
  overrideAccess: true,
})
const note = result.docs[0]

if (!note) {
  throw new Error(`Could not find the published note “${slug}”.`)
}

if (!isDryRun) {
  const editorConfig = await editorConfigFactory.default({ config: payload.config })
  const body = convertMarkdownToLexical({ editorConfig, markdown })

  await payload.update({
    collection: 'notes',
    id: note.id,
    data: { body },
    depth: 0,
    draft: false,
    overrideAccess: true,
  })
}

console.log(JSON.stringify({
  dryRun: isDryRun,
  noteId: note.id,
  paragraphCount: markdown.split(/\n\n+/).length,
  slug,
  sourceURL,
  updated: !isDryRun,
}, null, 2))

process.exit(0)
