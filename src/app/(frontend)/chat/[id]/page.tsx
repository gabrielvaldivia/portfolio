import { Chat } from '@/components/Chat'
import { getPageBySlug } from '@/lib/queries'
import { getPayload } from '@/lib/payload'
import { buildContext } from '@/lib/buildContext'

export const revalidate = 60

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await getPageBySlug('home')
  const payload = await getPayload()
  const { faqItems } = await buildContext()
  const allProjects = await payload.find({ collection: 'projects', sort: 'order', limit: 100, depth: 0 })
  const projectLinks = allProjects.docs.map((p: any) => ({ title: p.title, slug: p.slug }))
  const allPeople = await payload.find({ collection: 'people', limit: 100, depth: 0 })
  const peopleLinks = allPeople.docs.filter((p: any) => p.linkedIn).map((p: any) => ({ name: p.name, linkedin: p.linkedIn }))
  const allSideProjects = await payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 0 })
  const sideProjectLinks = allSideProjects.docs.filter((p: any) => p.slug).map((p: any) => ({ title: p.title, slug: p.slug }))
  const aboutPage = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, depth: 0, limit: 1 })
  const aboutData = aboutPage.docs[0] as any
  const talkLinks = [
    ...((aboutData?.talks || []) as any[]).filter((t: any) => t.url).map((t: any) => ({ title: t.title, url: t.url })),
    ...((aboutData?.interviews || []) as any[]).filter((t: any) => t.url).map((t: any) => ({ title: t.title, url: t.url })),
  ]

  const sections = (page?.sections || []) as any[]
  const aboutSection = sections.find((s: any) => s.blockType === 'aboutSection')
  const aboutImage = aboutSection?.image?.url || ''
  const aboutImageDark = aboutSection?.imageDark?.url || ''
  const chatBlock = sections.find((s: any) => s.blockType === 'accordion')
  const socialLinks = (chatBlock?.links || []).map((l: any) => ({
    platform: l.platform,
    url: l.url,
  }))

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <Chat
        faqItems={faqItems}
        avatarUrl={aboutImage}
        avatarUrlDark={aboutImageDark}
        projects={projectLinks}
        sideProjects={sideProjectLinks}
        people={peopleLinks}
        socialLinks={socialLinks}
        talks={talkLinks}
        fullPage
        initialConversationId={Number(id)}
      />
    </div>
  )
}
