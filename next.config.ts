import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The photo pages and feed read EXIF from public/photos with fs at
  // build/regeneration time, so the folder must ship with the functions.
  outputFileTracingIncludes: {
    '/photo': ['./public/photos/**'],
    '/photo/[slug]': ['./public/photos/**'],
    '/photo/feed.json': ['./public/photos/**'],
  },
  images: {
    // Serve media directly from R2. Vercel's image optimizer can return 402s
    // when the optimization allowance is exhausted, which makes otherwise
    // healthy CMS assets appear broken across the site.
    unoptimized: true,
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-0c00865d02c1476494008dbb74525b2a.r2.dev',
      },
    ],
  },
}

export default withPayload(nextConfig)
