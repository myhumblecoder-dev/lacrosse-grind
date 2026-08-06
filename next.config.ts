import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Prize photos live in Vercel Blob. next/image refuses any remote host
        // it hasn't been told about, and the store's subdomain is generated per
        // store — so match the whole public blob domain rather than pinning
        // this one, which would break if the store is ever recreated.
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
