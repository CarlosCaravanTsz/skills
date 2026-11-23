import type { NextConfig } from "next"

// Internal packages export TypeScript source ("just-in-time"); Next must transpile them.
const config: NextConfig = {
  transpilePackages: ["@org/core", "@org/ui"],
}

export default config
