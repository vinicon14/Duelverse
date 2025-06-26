import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/ygoprodeck.com/pics/**',
      },
      {
        protocol: 'https',
        hostname: 'images.ygoprodeck.com',
        port: '',
        pathname: '/images/cards/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ms.yugipedia.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
