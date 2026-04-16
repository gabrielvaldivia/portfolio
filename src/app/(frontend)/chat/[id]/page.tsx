import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Chat } from '@/components/Chat'
import { ChatView } from '@/components/ChatView'
import { Container } from '@/components/Container'
import { getPayload } from '@/lib/payload'
import { buildContext } from '@/lib/buildContext'

export const metadata: Metadata = {
  title: 'Chat — Gabriel Valdivia',
  description: 'Ask me anything.',
}

export const revalidate = 300

export default async function ChatByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isNew = id === 'new'
  const numericId = isNew ? null : Number(id)
  if (!isNew && (!Number.isFinite(numericId) || numericId! <= 0)) notFound()

  const payload = await getPayload()
  const { faqItems } = await buildContext()

  const [homePageResult, aboutPageResult, allProjects, allPeople, allSideProjects] = await Promise.all([
    payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, depth: 2, limit: 1 }),
    payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, depth: 0, limit: 1 }),
    payload.find({ collection: 'projects', sort: 'order', limit: 100, depth: 0 }),
    payload.find({ collection: 'people', limit: 100, depth: 0 }),
    payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 0 }),
  ])

  const home = homePageResult.docs[0] as any
  const aboutData = aboutPageResult.docs[0] as any
  const sections = (home?.sections || []) as any[]
  const aboutSection = sections.find((s: any) => s.blockType === 'aboutSection')
  const aboutImage = aboutSection?.image?.url || ''
  const aboutImageDark = aboutSection?.imageDark?.url || ''
  const chatBlock = sections.find((s: any) => s.blockType === 'accordion')

  const projectLinks = allProjects.docs.map((p: any) => ({ title: p.title, slug: p.slug }))
  const peopleLinks = allPeople.docs
    .filter((p: any) => p.linkedIn)
    .map((p: any) => ({ name: p.name, linkedin: p.linkedIn }))
  const sideProjectLinks = allSideProjects.docs
    .filter((p: any) => p.slug)
    .map((p: any) => ({ title: p.title, slug: p.slug }))
  const socialLinks = (chatBlock?.links || []).map((l: any) => ({ platform: l.platform, url: l.url }))
  const talkLinks = [
    ...((aboutData?.talks || []) as any[])
      .filter((t: any) => t.url)
      .map((t: any) => ({ title: t.title, url: t.url })),
    ...((aboutData?.interviews || []) as any[])
      .filter((t: any) => t.url)
      .map((t: any) => ({ title: t.title, url: t.url })),
  ]

  return (
    <section className="tablet:pb-10">
      <Container>
        <div className="relative bg-background-alt rounded-[20px] tablet:rounded-[30px] h-[calc(100dvh-110px)] tablet:h-[calc(100dvh-145px)] min-h-[500px] overflow-hidden">
          <ChatView view="chat" chatHref={isNew ? '/chat/new' : `/chat/${numericId}`}>
            <Chat
              faqItems={faqItems}
              avatarUrl={aboutImage}
              avatarUrlDark={aboutImageDark}
              projects={projectLinks}
              sideProjects={sideProjectLinks}
              people={peopleLinks}
              socialLinks={socialLinks}
              talks={talkLinks}
              persistentSidebar
              initialConversationId={isNew ? null : numericId}
            />
          </ChatView>
        </div>
      </Container>
    </section>
  )
}
