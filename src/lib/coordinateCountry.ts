import { geoContains, type GeoPermissibleObjects } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import countriesAtlas from 'world-atlas/countries-110m.json'

type CountryFeature = GeoPermissibleObjects & {
  properties?: {
    name?: unknown
  } | null
}

const countryTopology = countriesAtlas as unknown as Topology
const countryFeatures = (feature(
  countryTopology,
  countryTopology.objects.countries,
) as unknown as { features: CountryFeature[] }).features

const countryNameOverrides: Record<string, string> = {
  'United States of America': 'United States',
}

export function getCountryFromCoordinates(latitudeValue: unknown, longitudeValue: unknown) {
  if (latitudeValue === null || latitudeValue === undefined) return ''
  if (longitudeValue === null || longitudeValue === undefined) return ''

  const latitude = Number(latitudeValue)
  const longitude = Number(longitudeValue)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return ''
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return ''

  const match = countryFeatures.find((country) => geoContains(country, [longitude, latitude]))
  const name = typeof match?.properties?.name === 'string' ? match.properties.name.trim() : ''

  return countryNameOverrides[name] || name
}
