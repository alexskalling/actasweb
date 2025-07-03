/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5gb",
    },
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;
