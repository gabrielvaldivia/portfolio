import type { Metadata } from 'next'
import { ChatView } from '@/components/ChatView'
import { ChatMap } from '@/components/ChatMap'
import { ChatHeader } from '@/components/ChatHeader'

export const metadata: Metadata = {
  title: 'Chat Map — Gabriel Valdivia',
  description: 'Where conversations are coming from.',
}

export default function ChatMapPage() {
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
          <ChatView view="map">
            <ChatMap />
          </ChatView>
        </div>
    </section>
  )
}
