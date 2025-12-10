/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5gb",
    },
    serverComponentsExternalPackages: ["@react-email/render", "@google/generative-ai"],
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;
