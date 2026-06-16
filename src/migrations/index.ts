import * as migration_20260616_053500_add_client_details_active from './20260616_053500_add_client_details_active'

export const migrations = [
  {
    up: migration_20260616_053500_add_client_details_active.up,
    down: migration_20260616_053500_add_client_details_active.down,
    name: '20260616_053500_add_client_details_active',
  },
]
