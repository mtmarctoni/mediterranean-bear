import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Allow product mockup images served from the Printful CDN.
     * Printful hosts mockups on `cdn.printful.com` and `files.cdn.printful.com`.
     * See plans/002-product-catalog.md.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.printful.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "files.cdn.printful.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.printful.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
