import configPromise from '@payload-config'
import type { Payload } from 'payload'
import { getPayload as getPayloadInstance } from 'payload'

let payloadPromise: Promise<Payload> | null = null
const unavailablePayloads = new WeakSet<object>()

function getEmptyFindResult() {
  return {
    docs: [],
    totalDocs: 0,
    limit: 0,
    totalPages: 0,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  }
}

function getUnavailablePayload(): Payload {
  const payload = {
    find: async () => getEmptyFindResult(),
    findGlobal: async () => null,
    db: {
      drizzle: {
        execute: async () => ({ rows: [] }),
      },
    },
  } as unknown as Payload

  unavailablePayloads.add(payload as object)
  return payload
}

export function isPayloadUnavailable(payload: Payload) {
  return unavailablePayloads.has(payload as object)
}

export const getPayload = () => {
  if (!payloadPromise) {
    payloadPromise = getPayloadInstance({ config: configPromise }).catch((error) => {
      payloadPromise = null
      console.error('Payload unavailable; serving empty public data fallback.', error)
      return getUnavailablePayload()
    })
  }

  return payloadPromise
}
