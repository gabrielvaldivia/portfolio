import * as migration_20260616_053500_add_client_details_active from './20260616_053500_add_client_details_active';
import * as migration_20260707_000000_add_module_likes from './20260707_000000_add_module_likes';
import * as migration_20260708_000000_add_module_like_events from './20260708_000000_add_module_like_events';
import * as migration_20260708_190000_add_project_hide from './20260708_190000_add_project_hide';
import * as migration_20260708_223000_add_module_like_event_amount from './20260708_223000_add_module_like_event_amount';
import * as migration_20260708_225000_backfill_module_like_event_amount from './20260708_225000_backfill_module_like_event_amount';
import * as migration_20260710_000000_add_browser_module from './20260710_000000_add_browser_module';
import * as migration_20260714_000000_index_conversations_updated_at from './20260714_000000_index_conversations_updated_at';
import * as migration_20260717_124017_add_photos_collection from './20260717_124017_add_photos_collection';
import * as migration_20260718_194126_add_page_meta_image from './20260718_194126_add_page_meta_image';

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
  {
    up: migration_20260708_223000_add_module_like_event_amount.up,
    down: migration_20260708_223000_add_module_like_event_amount.down,
    name: '20260708_223000_add_module_like_event_amount',
  },
  {
    up: migration_20260708_225000_backfill_module_like_event_amount.up,
    down: migration_20260708_225000_backfill_module_like_event_amount.down,
    name: '20260708_225000_backfill_module_like_event_amount',
  },
  {
    up: migration_20260710_000000_add_browser_module.up,
    down: migration_20260710_000000_add_browser_module.down,
    name: '20260710_000000_add_browser_module',
  },
  {
    up: migration_20260714_000000_index_conversations_updated_at.up,
    down: migration_20260714_000000_index_conversations_updated_at.down,
    name: '20260714_000000_index_conversations_updated_at',
  },
  {
    up: migration_20260717_124017_add_photos_collection.up,
    down: migration_20260717_124017_add_photos_collection.down,
    name: '20260717_124017_add_photos_collection',
  },
  {
    up: migration_20260718_194126_add_page_meta_image.up,
    down: migration_20260718_194126_add_page_meta_image.down,
    name: '20260718_194126_add_page_meta_image'
  },
];
