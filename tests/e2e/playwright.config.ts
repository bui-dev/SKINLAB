export default {
  testDir: "./",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1, // Deterministic sequential execution for foundation security tests
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/foundation-security-results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
};

