'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Globe } from 'cobe'

export type GlobeLocation = readonly [latitude: number, longitude: number]

const GLOBE_SIZE = 168

function locationToAngles([latitude, longitude]: GlobeLocation) {
  return [
    Math.PI - ((longitude * Math.PI) / 180 - Math.PI / 2),
    (latitude * Math.PI) / 180,
  ] as const
}

function shortestAngleDistance(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export function TimelineCursorGlobe({
  active,
  location,
}: {
  active: boolean
  location: GlobeLocation
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const currentAnglesRef = useRef(locationToAngles(location))
  const targetAnglesRef = useRef(locationToAngles(location))
  const locationRef = useRef(location)
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
    locationRef.current = location
    targetAnglesRef.current = locationToAngles(location)
  }, [location])

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host || !active) return

    const canvas = document.createElement('canvas')
    canvas.width = GLOBE_SIZE
    canvas.height = GLOBE_SIZE
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const [phi, theta] = currentAnglesRef.current
    let disposed = false
    let animationFrame: number | null = null
    let globe: Globe | null = null
    let destroyGlobe: (() => void) | null = null

    void import('cobe').then(({ default: createGlobe }) => {
      if (disposed) return

      const createdGlobe = createGlobe(canvas, {
        width: GLOBE_SIZE * devicePixelRatio,
        height: GLOBE_SIZE * devicePixelRatio,
        devicePixelRatio,
        phi,
        theta,
        dark: isDark ? 1 : 0,
        diffuse: 1.15,
        mapSamples: 12000,
        mapBrightness: isDark ? 3 : 1.6,
        baseColor: isDark ? [0.28, 0.28, 0.28] : [1, 1, 1],
        markerColor: [0, 0.12, 0.92],
        glowColor: isDark ? [0.08, 0.08, 0.08] : [1, 1, 1],
        markers: [{ location: [locationRef.current[0], locationRef.current[1]], size: 0.09 }],
      })
      globe = createdGlobe
      destroyGlobe = () => createdGlobe.destroy()

      const animate = () => {
        if (!globe || disposed) return

        const [currentPhi, currentTheta] = currentAnglesRef.current
        const [targetPhi, targetTheta] = targetAnglesRef.current
        const phiDistance = shortestAngleDistance(currentPhi, targetPhi)
        const thetaDistance = targetTheta - currentTheta
        const nextPhi = Math.abs(phiDistance) < 0.001
          ? targetPhi
          : currentPhi + phiDistance * 0.1
        const nextTheta = Math.abs(thetaDistance) < 0.001
          ? targetTheta
          : currentTheta + thetaDistance * 0.1

        currentAnglesRef.current = [nextPhi, nextTheta]
        globe.update({
          phi: nextPhi,
          theta: nextTheta,
          markers: [{
            location: [locationRef.current[0], locationRef.current[1]],
            size: 0.09,
          }],
        })
        animationFrame = requestAnimationFrame(animate)
      }

      animationFrame = requestAnimationFrame(animate)
    }).catch(() => {})

    return () => {
      disposed = true
      if (animationFrame !== null) cancelAnimationFrame(animationFrame)
      destroyGlobe?.()
      host.replaceChildren()
    }
  }, [active, isDark])

  return (
    <div ref={hostRef} aria-hidden="true" />
  )
}
