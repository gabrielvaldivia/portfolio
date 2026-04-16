import type { Metadata } from 'next'
import { ChatView } from '@/components/ChatView'
import { ChatMap } from '@/components/ChatMap'
import { Container } from '@/components/Container'

export const metadata: Metadata = {
  title: 'Chat Map — Gabriel Valdivia',
  description: 'Where conversations are coming from.',
}

export default function ChatMapPage() {
  return (
    <section className="tablet:pb-10">
      <Container>
        <div className="relative bg-background-alt rounded-[20px] tablet:rounded-[30px] h-[calc(100dvh-110px)] tablet:h-[calc(100dvh-145px)] min-h-[500px] overflow-hidden">
          <ChatView view="map">
            <ChatMap />
          </ChatView>
        </div>
      </Container>
    </section>
  )
}
