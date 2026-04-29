import type { NextConfig } from "next";
import path from "path";
import os from "os";

const nextConfig: NextConfig = {
  // Move .next to local fast storage to avoid slow filesystem issues
  distDir: process.env.NODE_ENV === 'development'
    ? path.join(os.tmpdir(), 'iris-next-dev')
    : '.next',
};

export default nextConfig;
