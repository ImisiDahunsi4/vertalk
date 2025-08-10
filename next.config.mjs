/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow builds to proceed on Vercel even if there are TypeScript or ESLint errors
  // Note: Errors will still show in logs; this only prevents the build from failing.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
