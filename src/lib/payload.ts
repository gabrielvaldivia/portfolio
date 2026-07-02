import configPromise from '@payload-config'
import type { Payload } from 'payload'
import { getPayload as getPayloadInstance } from 'payload'

let payloadPromise: Promise<Payload> | null = null

export const getPayload = () => {
  if (!payloadPromise) {
    payloadPromise = getPayloadInstance({ config: configPromise }).catch((error) => {
      payloadPromise = null
      throw error
    })
  }

  return payloadPromise
}
