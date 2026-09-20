/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate mounting in development for Monaco & WebSockets
};

module.exports = nextConfig;
