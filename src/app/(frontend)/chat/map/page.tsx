import type { Metadata } from 'next'
import { ChatView } from '@/components/ChatView'
import { ChatMap } from '@/components/ChatMap'

export const metadata: Metadata = {
  title: 'Chat Map — Gabriel Valdivia',
  description: 'Where conversations are coming from.',
}

export default function ChatMapPage() {
  return (
    <section>
        <div className="relative h-dvh min-h-[500px] overflow-hidden">
          <ChatView view="map">
            <ChatMap />
          </ChatView>
        </div>
    </section>
  )
}
