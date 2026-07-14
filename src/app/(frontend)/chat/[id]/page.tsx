import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Chat } from '@/components/Chat'
import { ChatView } from '@/components/ChatView'
import { ChatHeader } from '@/components/ChatHeader'
import { getPayload } from '@/lib/payload'
import { getFAQItemsFromSections } from '@/lib/buildContext'

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
  const faqItems = getFAQItemsFromSections(sections)
  const chatBlock = sections.find((s: any) => s.blockType === 'accordion')

  const projectLinks = allProjects.docs.map((p: any) => ({ title: p.title, slug: p.slug }))
  const peopleLinks = allPeople.docs
    .filter((p: any) => p.linkedIn)
    .map((p: any) => ({ name: p.name, linkedin: p.linkedIn }))
  const sideProjectLinks = allSideProjects.docs
    .filter((p: any) => p.slug)
    .map((p: any) => ({ title: p.title, slug: p.slug }))
  const socialLinks = (chatBlock?.links || [])
    .filter((link: any) => {
      const platform = link.platform.toLowerCase().replace(/[^a-z]/g, '')
      return !['x', 'twitter', 'email', 'mail', 'linkedin'].includes(platform)
    })
    .map((link: any) => ({ platform: link.platform, url: link.url }))
  const talkLinks = [
    ...((aboutData?.talks || []) as any[])
      .filter((t: any) => t.url)
      .map((t: any) => ({ title: t.title, url: t.url })),
    ...((aboutData?.interviews || []) as any[])
      .filter((t: any) => t.url)
      .map((t: any) => ({ title: t.title, url: t.url })),
  ]

  return (
    <section>
        <div
          className="fixed inset-x-0 overflow-hidden tablet:min-h-[500px]"
          style={{
            height: 'var(--chat-viewport-height, 100dvh)',
            transform: 'translateY(var(--chat-viewport-top, 0px))',
          }}
        >
          <ChatHeader />
          <ChatView view="chat" chatHref={isNew ? '/chat/new' : `/chat/${numericId}`}>
            <Chat
              faqItems={faqItems}
              avatarUrl="/chat-avatar-light.webp"
              avatarUrlDark="/chat-avatar-dark.webp"
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
    </section>
  )
}
