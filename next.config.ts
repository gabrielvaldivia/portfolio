import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-0c00865d02c1476494008dbb74525b2a.r2.dev',
      },
    ],
  },
}

export default withPayload(nextConfig)
