import * as migration_20260616_053500_add_client_details_active from './20260616_053500_add_client_details_active'
import * as migration_20260707_000000_add_module_likes from './20260707_000000_add_module_likes'
import * as migration_20260708_000000_add_module_like_events from './20260708_000000_add_module_like_events'
import * as migration_20260708_190000_add_project_hide from './20260708_190000_add_project_hide'

export const migrations = [
  {
    up: migration_20260616_053500_add_client_details_active.up,
    down: migration_20260616_053500_add_client_details_active.down,
    name: '20260616_053500_add_client_details_active',
  },
  {
    up: migration_20260707_000000_add_module_likes.up,
    down: migration_20260707_000000_add_module_likes.down,
    name: '20260707_000000_add_module_likes',
  },
  {
    up: migration_20260708_000000_add_module_like_events.up,
    down: migration_20260708_000000_add_module_like_events.down,
    name: '20260708_000000_add_module_like_events',
  },
  {
    up: migration_20260708_190000_add_project_hide.up,
    down: migration_20260708_190000_add_project_hide.down,
    name: '20260708_190000_add_project_hide',
  },
]
