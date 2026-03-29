# I Rebuilt My Portfolio From Scratch in 5 Days (And Why I Left Framer Behind)

Last week I ported my entire portfolio site from Framer to a custom stack — Next.js 15, Payload CMS, Tailwind CSS, and Vercel. From first commit to live site, it took about five days and 59 commits. Here's why I did it and what I learned.

## Why leave Framer?

Framer is great for prototyping and getting something live fast. I used it for a while and it served me well. But the longer I used it, the more I kept running into the same walls:

- **I couldn't build what I wanted.** Custom interactions, physics-based animations, fine-grained responsive behavior — anything beyond what Framer's visual editor supports meant fighting the tool instead of using it.
- **Performance was out of my hands.** Framer ships its own runtime and makes its own decisions about how your site loads. I wanted control over image optimization, lazy loading, and caching.
- **Content updates felt heavy.** Changing a project or updating copy meant opening the editor, finding the right frame, making the change, and publishing. For a portfolio that should be easy to update, it wasn't.
- **I'm a designer who codes.** At some point I realized I was using a visual tool to avoid writing code I actually enjoy writing. The abstraction wasn't saving me time — it was slowing me down.

## The stack

I landed on a pretty simple setup:

- **Next.js 15** with the App Router and React Server Components. Pages fetch data at the server level and stream to the client. I'm using ISR with 60-second revalidation so the site stays fast without rebuilding on every change.
- **Payload CMS** for content management. It runs alongside Next.js in the same app — no separate backend to deploy. I defined collections for projects, clients, testimonials, services, and pages. Each page is built from composable content blocks (hero, horizontal scroll, about section, FAQ, etc.) that I can rearrange in the admin panel.
- **Tailwind CSS 4** for styling. No component library. Custom breakpoints for mobile, tablet, and desktop. Dark mode support throughout.
- **Cloudflare R2** for media storage via Payload's S3 adapter. Way cheaper than most alternatives for serving images and video.
- **Vercel** for hosting and deployment. Push to main, it's live.

## The block system

This was the most important architectural decision. Instead of hardcoding page layouts, every page is assembled from content blocks stored in the CMS. I built blocks for heroes, horizontal scroll carousels, image grids, device mockups, text sections, accordions, and more.

In the CMS, I compose a page by stacking blocks. On the frontend, a single `renderSection` function maps each block type to its React component. Adding a new section type means adding a new block definition in Payload and a new case in the renderer. The content and the presentation stay cleanly separated.

This is the kind of thing Framer makes hard. In Framer, your content lives inside your layout. Here, my layout is just a function of the data.

## What I could finally build

Once I had full control, I could build things that would've been impossible or painful in Framer:

- **Horizontal scroll containers** with momentum physics, snap points, and edge-fading masks that work differently on mobile vs desktop.
- **Device mockup blocks** — iPhone, desktop frames — that wrap images and videos with realistic bezels. I can drop these into any project page from the CMS.
- **A FitText component** that scales the homepage headline to fill the viewport width, responsive down to the pixel.
- **Birthday balloons** with actual physics simulation and confetti that collides with UI elements. Because why not.
- **Lazy-loaded video** with fine-grained control over when things load and play.
- **Dark mode** with per-image variants — the about section photo swaps between light and dark versions.

None of these required a plugin or a workaround. They're just React components.

## The five-day timeline

Here's roughly how it went:

**Day 1:** Initial scaffold. Got Next.js and Payload CMS running together, defined the core collections (Projects, Clients, People, Media), deployed to Vercel, and wrestled with media storage until landing on Cloudflare R2.

**Day 2:** Page structure and blocks. Built the homepage renderer with the block system, created the hero, horizontal scroll, about section, and marquee blocks. Got the basic layout and typography in place.

**Day 3:** Project detail pages and polish. Built out individual project pages with the device mockup blocks, image grids, and video players. Added the work index, about page, and playground. Started dialing in responsive behavior.

**Day 4:** Design system and interactions. Fine-tuned typography, hover states, spacing. Built the momentum scroll and FitText components. Added the client marquee, testimonials, and FAQ accordion. Dark mode throughout.

**Day 5:** The fun stuff and final polish. Birthday balloons with physics. The donation pill. Avatar borders, video performance, mobile-specific interactions. The kind of details you only get to when the foundation is solid.

## What I'd tell other designers

If you're a designer considering this kind of move, a few things:

**You don't need to know everything upfront.** I didn't plan the block system on day one — it emerged naturally as I started building pages and realized I wanted composability. Start building and let the architecture reveal itself.

**A headless CMS changes the game.** The ability to update content without touching code — and to structure that content however I want — is worth the setup cost. Payload in particular is great because it lives in the same codebase. One deploy, one repo.

**AI tooling made this realistic.** I'll be honest — I used Claude extensively throughout this build. Not to generate the site for me, but as a collaborator. Debugging responsive layouts, figuring out Payload's config API, optimizing images, working through physics math for the balloon animation. It made a five-day timeline possible for one person.

**The result is just better.** The site is faster, I have full control over every pixel, and updating content is easier than it ever was in Framer. The code is mine to extend however I want. That's worth a week of work.

## The numbers

- 59 commits over 5 days
- ~30 components
- 8 content block types
- 8 CMS collections
- Full dark mode
- ISR with 60s revalidation
- Lighthouse performance score: you tell me

---

*The site is live at [valdivia.works](https://valdivia.works). The code is the portfolio itself — built with Next.js 15, Payload CMS, Tailwind CSS 4, and deployed on Vercel.*
