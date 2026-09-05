import { normalizeConversationMessages } from './chatMessages'

export function toPublicConversation(document: any) {
  return {
    id: document.id,
    title: typeof document.title === 'string' ? document.title : '',
    location: typeof document.location === 'string' ? document.location : '',
    latitude: typeof document.latitude === 'number' ? document.latitude : null,
    longitude: typeof document.longitude === 'number' ? document.longitude : null,
    messages: normalizeConversationMessages(document.messages) || [],
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}
