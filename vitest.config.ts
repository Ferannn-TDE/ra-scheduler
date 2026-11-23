import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Pin a timezone that observes daylight saving so date tests are deterministic.
    env: { TZ: "America/Chicago" },
  },
});
