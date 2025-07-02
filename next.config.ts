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
  // A propriedade 'allowedDevOrigins' foi removida, pois pode causar problemas de Service Worker.
};

export default nextConfig;
