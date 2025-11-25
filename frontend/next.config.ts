import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle snarkjs and wasm files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    })

    // Externalize snarkjs for server-side
    if (isServer) {
      config.externals.push("snarkjs")
    }

    // Fix for snarkjs
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      readline: false,
    }

    return config
  },
};

export default nextConfig;
