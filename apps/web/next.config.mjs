/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/docs/recursion-shield",
        destination: "/docs/safety-rails",
        permanent: true,
      },
      {
        source: "/docs/dow-safety-rails",
        destination: "/docs/safety-rails",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
