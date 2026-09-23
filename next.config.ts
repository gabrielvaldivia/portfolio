import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  poweredByHeader: false,
  experimental: {
    globalNotFound: true,
  },
  async redirects() {
    return [
      // Keep older About pages working after portrait filenames change.
      ...[
        '/images/about-portrait-light.jpg',
        '/images/about-portrait-dark.jpg',
        '/media/about-portrait-light.jpg',
        '/media/about-portrait-dark.jpg',
      ].map((source) => ({
        source,
        destination: '/images/about-portrait.jpg',
        permanent: true,
      })),
      {
        source: '/engagement-models',
        destination: '/working-together',
        permanent: true,
      },
      {
        source: '/photo',
        destination: '/photos',
        permanent: true,
      },
      {
        source: '/photo/:path+',
        destination: '/photos/:path+',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/notes/preview/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
    ]
  },
  turbopack: {
    root: process.cwd(),
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
      {
        protocol: 'https',
        hostname: 'substackcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn-images-1.medium.com',
      },
    ],
  },
}

export default withPayload(nextConfig)
