import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Ships `.next/standalone` with only the traced dependencies, so the Docker
  // image doesn't carry the whole `node_modules`.
  output: "standalone",
  // better-sqlite3 loads its addon through `bindings`, which resolves the path
  // at runtime — file tracing cannot see it and would leave the binary out.
  outputFileTracingIncludes: {
    "**": ["./node_modules/better-sqlite3/build/Release/better_sqlite3.node"],
  },
};

export default nextConfig;
