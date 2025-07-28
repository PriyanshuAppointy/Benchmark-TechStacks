/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable default Next.js server since we're using custom server
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig 