'use client'

import {
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
  type GeoSphere,
} from 'd3-geo'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import landAtlas from 'world-atlas/land-110m.json'

export type GlobeLocation = readonly [latitude: number, longitude: number]

const GLOBE_SIZE = 168
const GLOBE_SCALE = GLOBE_SIZE * 0.44
const LIGHT_ACCENT_COLOR = 'rgb(0 31 235)'
const DARK_ACCENT_COLOR = 'rgb(0 157 255)'
const SPHERE: GeoSphere = { type: 'Sphere' }

const landTopology = landAtlas as unknown as Topology
const LAND = feature(
  landTopology,
  landTopology.objects.land,
) as GeoPermissibleObjects

function shortestLongitudeDistance(from: number, to: number) {
  return ((to - from + 540) % 360) - 180
}

export function TimelineCursorGlobe({
  active,
  location,
  longitudeOffsetRef,
}: {
  active: boolean
  location: GlobeLocation
  longitudeOffsetRef?: RefObject<number>
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const currentLocationRef = useRef<GlobeLocation>(location)
  const targetLocationRef = useRef<GlobeLocation>(location)
  const [isDark, setIsDark] = useState(() => (
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-color-scheme: dark)').matches
  ))

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const updateColorScheme = () => setIsDark(colorScheme.matches)

    updateColorScheme()
    colorScheme.addEventListener('change', updateColorScheme)
    return () => colorScheme.removeEventListener('change', updateColorScheme)
  }, [])

  useEffect(() => {
    targetLocationRef.current = location
  }, [location])

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host || !active) return

    const canvas = document.createElement('canvas')
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = GLOBE_SIZE * devicePixelRatio
    canvas.height = GLOBE_SIZE * devicePixelRatio
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)

    const context = canvas.getContext('2d')
    if (!context) {
      host.replaceChildren()
      return
    }

    const projection = geoOrthographic()
      .clipAngle(90)
      .precision(0.35)
      .scale(GLOBE_SCALE)
      .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
    const path = geoPath(projection, context)
    let animationFrame: number | null = null
    let disposed = false
    let currentLongitudeOffset = longitudeOffsetRef?.current ?? 0

    const draw = () => {
      if (disposed) return

      const [currentLatitude, currentLongitude] = currentLocationRef.current
      const [targetLatitude, targetLongitude] = targetLocationRef.current
      const longitudeDistance = shortestLongitudeDistance(currentLongitude, targetLongitude)
      const latitudeDistance = targetLatitude - currentLatitude
      const nextLatitude = Math.abs(latitudeDistance) < 0.01
        ? targetLatitude
        : currentLatitude + latitudeDistance * 0.1
      const nextLongitude = Math.abs(longitudeDistance) < 0.01
        ? targetLongitude
        : currentLongitude + longitudeDistance * 0.1

      currentLocationRef.current = [nextLatitude, nextLongitude]
      const targetLongitudeOffset = longitudeOffsetRef?.current ?? 0
      currentLongitudeOffset += (targetLongitudeOffset - currentLongitudeOffset) * 0.12
      projection.rotate([
        -nextLongitude + currentLongitudeOffset,
        -nextLatitude,
        0,
      ])

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      context.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE)

      const sphereFill = context.createRadialGradient(
        GLOBE_SIZE * 0.36,
        GLOBE_SIZE * 0.3,
        GLOBE_SIZE * 0.04,
        GLOBE_SIZE * 0.52,
        GLOBE_SIZE * 0.52,
        GLOBE_SIZE * 0.52,
      )
      if (isDark) {
        sphereFill.addColorStop(0, '#5b5b5b')
        sphereFill.addColorStop(1, '#292929')
      } else {
        sphereFill.addColorStop(0, '#ffffff')
        sphereFill.addColorStop(1, '#eeeeee')
      }

      context.save()
      context.beginPath()
      path(SPHERE)
      context.shadowBlur = 18
      context.shadowColor = isDark ? 'rgb(0 0 0 / 0.45)' : 'rgb(0 0 0 / 0.16)'
      context.fillStyle = sphereFill
      context.fill()
      context.restore()

      context.beginPath()
      path(LAND)
      context.fillStyle = isDark ? 'rgb(238 238 238)' : 'rgb(168 168 168)'
      context.fill()

      context.beginPath()
      path(SPHERE)
      context.strokeStyle = isDark ? 'rgb(255 255 255 / 0.12)' : 'rgb(0 0 0 / 0.08)'
      context.lineWidth = 1
      context.stroke()

      const marker = projection([targetLongitude, targetLatitude])
      if (marker) {
        context.beginPath()
        context.arc(marker[0], marker[1], 5.5, 0, Math.PI * 2)
        context.fillStyle = isDark ? DARK_ACCENT_COLOR : LIGHT_ACCENT_COLOR
        context.fill()
        context.strokeStyle = isDark ? '#292929' : '#ffffff'
        context.lineWidth = 2
        context.stroke()
      }

      animationFrame = requestAnimationFrame(draw)
    }

    animationFrame = requestAnimationFrame(draw)

    return () => {
      disposed = true
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
      host.replaceChildren()
    }
  }, [active, isDark])

  return <div ref={hostRef} aria-hidden="true" />
}
