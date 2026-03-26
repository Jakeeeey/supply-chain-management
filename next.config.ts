import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Tells Next.js to trust requests coming from your specific machine name
    allowedDevOrigins: ["msi-andrie"],
};

export default nextConfig;