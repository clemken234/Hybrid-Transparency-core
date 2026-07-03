import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // turbopack: {},
  serverExternalPackages: ['@aztec/bb.js', 'poseidon-lite', '@noir-lang/noir_js', '@noir-lang/acvm_js'],
  transpilePackages: [],
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
