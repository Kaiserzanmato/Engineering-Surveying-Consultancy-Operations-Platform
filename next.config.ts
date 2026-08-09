import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pins the workspace root to this repo so Turbopack doesn't get
    // confused by an unrelated package-lock.json in the parent home dir.
    root: path.join(__dirname),
  },
};

export default nextConfig;
