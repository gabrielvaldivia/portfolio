import type { CollectionConfig } from 'payload'

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Admin',
    useAsTitle: 'email',
  },
  auth: {
    tokenExpiration: THIRTY_DAYS_IN_SECONDS,
  },
  fields: [],
}
