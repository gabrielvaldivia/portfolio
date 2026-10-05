import { revalidateTag, unstable_cache } from 'next/cache'
import { BACKGROUND_WORK_CACHE_TAG } from './contentCacheTags'
import { isBackgroundWorkDue, readBackgroundWorkSchedule, type BackgroundJob } from './backgroundWorkSchedule'

const getCachedSchedule = unstable_cache(async (environment: string, _hour: number) => {
  const { getPayload, isPayloadUnavailable } = await import('./payload')
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Database unavailable')
  return readBackgroundWorkSchedule(payload.db.drizzle, environment)
}, ['background-work-schedule-v1'], { tags: [BACKGROUND_WORK_CACHE_TAG], revalidate: 3600 })

export async function shouldRunBackgroundWork(job: BackgroundJob) {
  const now = Date.now()
  // A new hourly key forces a fresh read, even if a CLI edit missed invalidation.
  // Unlike time-based stale-while-revalidate, it cannot keep an empty result stale.
  const schedule = await getCachedSchedule(
    process.env.NODE_ENV === 'production' ? 'production' : 'local',
    Math.floor(now / 3_600_000),
  )
  return isBackgroundWorkDue(schedule, job, now)
}

export function invalidateBackgroundWork() {
  revalidateTag(BACKGROUND_WORK_CACHE_TAG, { expire: 0 })
}
