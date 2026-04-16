import type { CollectionConfig } from 'payload'

export const Conversations: CollectionConfig = {
  slug: 'conversations',
  labels: { singular: 'Chat', plural: 'Chats' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'location', 'updatedAt'],
    group: 'Collections',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'location', type: 'text' },
    { name: 'latitude', type: 'number', admin: { description: 'Latitude in decimal degrees (-90 to 90).' } },
    { name: 'longitude', type: 'number', admin: { description: 'Longitude in decimal degrees (-180 to 180).' } },
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
