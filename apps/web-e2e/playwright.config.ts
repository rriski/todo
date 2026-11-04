import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  snapshotPathTemplate: "src/__screenshots__/{platform}/{arg}{ext}",
  // Screenshots differ per OS, so an OS without committed baselines skips the comparison.
  ignoreSnapshots: !existsSync(`src/__screenshots__/${process.platform}`),
  use: { baseURL: "http://localhost:5173" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: [
    { command: "go run .", cwd: "../api", url: "http://localhost:8080/api/tasks" },
    { command: "pnpm exec vite", cwd: "../web", url: "http://localhost:5173" },
  ],
});
