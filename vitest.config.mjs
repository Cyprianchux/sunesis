import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.js"],
    testTimeout: 15000,
    setupFiles: ["tests/unit/setup.js"],
  },
});
