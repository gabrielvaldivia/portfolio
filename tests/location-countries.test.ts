import assert from 'node:assert/strict'
import test from 'node:test'
import { countryCodeByName, getHighlightLocationCountry } from '../src/lib/locationCountries'

test('recognizes US states and Canadian provinces in saved highlight labels', () => {
  for (const [location, country] of [
    ['Newburgh, NY', 'US'], ['San Francisco, CA', 'US'], ['Indpls, IN', 'US'],
    ['Toronto, ON', 'CA'], ['Montréal, QC', 'CA'], ['Vancouver, BC', 'CA'],
  ]) assert.equal(getHighlightLocationCountry(location), country)
})

test('recognizes full country names without confusing them with region codes', () => {
  for (const [location, country] of [
    ['Mislata, Spain', 'ES'], ['São Paulo, Brazil', 'BR'], ['London, United Kingdom', 'GB'],
    ['United States', 'US'], ['Canada', 'CA'], ['New York, United States', 'US'],
    ['Tbilisi, Georgia', 'GE'], ['Riyadh, Saudi Arabia', 'SA'],
  ]) assert.equal(getHighlightLocationCountry(location), country)
  assert.equal(countryCodeByName.get('united states of america'), 'US')
})

test('does not fabricate flags for unknown or city-only labels', () => {
  for (const location of ['', '   ', 'Newburgh', 'NY', 'Unknown', 'Somewhere, ZZ']) {
    assert.equal(getHighlightLocationCountry(location), '')
  }
})
