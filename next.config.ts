import type { NextConfig } from "next";

const forGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(forGitHubPages
    ? {
        output: "export",
        basePath: "/AP-Grader",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    middlewareClientMaxBodySize: "10mb",
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
