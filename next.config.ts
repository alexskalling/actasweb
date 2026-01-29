/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5gb",
    },
  },
  serverExternalPackages: ["@react-email/render", "@google/generative-ai"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'actasdereuniones.ai',
      },
    ],
  },
};

export default nextConfig;
