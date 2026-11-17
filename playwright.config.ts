import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 15_000,
    channel: "chrome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "php artisan serve --port=8000",
      cwd: "../Proformas-Back",
      // Las pruebas crean datos: si Playwright levanta el back, lo apunta a
      // la COPIA de la base (nunca a la demo `proformas` del puerto 5432).
      env: {
        DB_PORT: process.env.E2E_DB_PORT ?? "5434",
        DB_DATABASE: process.env.E2E_DB_DATABASE ?? "proformas_e2e",
      },
      url: "http://127.0.0.1:8000/sanctum/csrf-cookie",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      use: {
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
