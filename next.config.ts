import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // O relatório de apuração vai no formulário: até 4 MB, mais a folga do multipart.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
