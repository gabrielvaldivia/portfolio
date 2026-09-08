import type { CollectionConfig } from 'payload'

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

const canUnlockOwnAccount: NonNullable<CollectionConfig['access']>['unlock'] = ({ req }) => {
  if (!req.user || req.user.collection !== 'users') return false

  return {
    id: {
      equals: req.user.id,
    },
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    unlock: canUnlockOwnAccount,
  },
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
