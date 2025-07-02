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
  // Adiciona a configuração para permitir o acesso do Firebase Studio
  experimental: {
    allowedDevOrigins: ["9003-firebase-duelverse-remote-*.cloudworkstations.dev"],
  },
};

export default nextConfig;
