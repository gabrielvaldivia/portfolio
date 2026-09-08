import assert from 'node:assert/strict'
import test from 'node:test'
import { isMobileSafariUserAgent } from '../src/lib/mobileSafari'

const iPhoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
const iPhoneChrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1'
const desktopSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15'

test('targets Mobile Safari without affecting Chrome on iOS or desktop Safari', () => {
  assert.equal(isMobileSafariUserAgent(iPhoneSafari), true)
  assert.equal(isMobileSafariUserAgent(iPhoneChrome), false)
  assert.equal(isMobileSafariUserAgent(desktopSafari), false)
})
