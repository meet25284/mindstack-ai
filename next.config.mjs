/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * serverExternalPackages tells Next.js NOT to bundle these packages through
   * webpack. Instead they are required at runtime via Node.js require().
   *
   * pdf-parse: reads test PDF fixtures from disk at import time, which breaks
   *   webpack's static analysis and causes "Cannot find module" errors at build.
   *
   * mammoth: contains binary assets and streams that behave incorrectly when
   *   bundled by webpack in a serverless/Edge environment.
   */
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
