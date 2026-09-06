import type { CollectionConfig } from 'payload'

const isAuthenticated: NonNullable<CollectionConfig['access']>['read'] = ({ req }) => Boolean(req.user)

export const NoteSubscribers: CollectionConfig = {
  slug: 'note-subscribers',
  labels: {
    singular: 'Subscriber',
    plural: 'Subscribers',
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'confirmedAt', 'updatedAt'],
  },
  access: {
    create: isAuthenticated,
    delete: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending confirmation', value: 'pending' },
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
    },
    {
      name: 'confirmedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
      },
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'website',
      admin: {
        readOnly: true,
      },
    },
  ],
}
