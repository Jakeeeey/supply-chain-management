import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname),
  /* config options here */
  allowedDevOrigins: ["100.81.225.79", "msi-eulysis", "100.116.150.68", "msi-jake"],
};

export default nextConfig;
