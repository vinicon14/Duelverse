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
};

export default nextConfig;
