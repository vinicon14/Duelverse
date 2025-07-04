const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
    };

    return config;
  },
  // Move allowedDevOrigins para o nível superior da configuração
  images: {
    domains: ['images.ygoprodeck.com'],
  },
  allowedDevOrigins: ["9003-firebase-duelverse-remote-*.cloudworkstations.dev"],
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
};

module.exports = withPWA(nextConfig);