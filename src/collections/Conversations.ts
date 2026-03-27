import type { CollectionConfig } from 'payload'

export const Conversations: CollectionConfig = {
  slug: 'conversations',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'location', 'updatedAt'],
    group: 'Site',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'location', type: 'text' },
    {
      name: 'messages',
      type: 'json',
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Your answer or notes about this conversation. This will be used as context for future chats when similar questions are asked.',
      },
    },
  ],
}
