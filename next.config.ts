import type { NextConfig } from "next";
import path from "path";

const repoName = "glc-kostnadskontroll";
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}` : "",
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
