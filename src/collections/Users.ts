import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Admin',
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
}
