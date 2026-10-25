import type { Access, CollectionConfig, GlobalConfig } from 'payload'

// MCP API keys authenticate REST requests as their own collection. Only CMS
// users may write, so key holders stay limited to the MCP tools they were granted.
export const isCmsUser = ({ req }: { req: { user?: { collection?: string } | null } }) =>
  req.user?.collection === 'users'

const cmsUserAccess: Access = isCmsUser

export function withCmsUserAccess(collection: CollectionConfig): CollectionConfig {
  const access = collection.access || {}
  return {
    ...collection,
    access: {
      ...access,
      read: access.read || cmsUserAccess,
      create: access.create || cmsUserAccess,
      update: access.update || cmsUserAccess,
      delete: access.delete || cmsUserAccess,
      readVersions: access.readVersions || cmsUserAccess,
      unlock: access.unlock || cmsUserAccess,
    },
  }
}

export function withGlobalCmsUserAccess(global: GlobalConfig): GlobalConfig {
  const access = global.access || {}
  return {
    ...global,
    access: {
      ...access,
      read: access.read || cmsUserAccess,
      update: access.update || cmsUserAccess,
      readVersions: access.readVersions || cmsUserAccess,
    },
  }
}
