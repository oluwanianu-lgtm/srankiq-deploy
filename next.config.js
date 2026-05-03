/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ['yt3.ggpht.com','lh3.googleusercontent.com'],
  },
}
module.exports = nextConfig
