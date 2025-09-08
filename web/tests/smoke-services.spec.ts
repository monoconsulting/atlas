import { test, expect } from "@playwright/test";

test.describe("Smoke: backend and ports API", () => {
  test("loads backend root and ports API responds ok", async ({ page }) => {
    // Open backend root
    const resp = await page.goto("http://localhost:8199/", { waitUntil: "domcontentloaded", timeout: 20000 });
    expect(resp?.ok()).toBeTruthy();

    // Call ports API from the page context
    const data = await page.evaluate(async () => {
      const r = await fetch("http://localhost:8199/api/ports");
      return { status: r.status, json: await r.json() };
    });

    expect(data.status).toBe(200);
    expect(data.json?.ok).toBe(true);
    expect(Array.isArray(data.json?.ports)).toBe(true);
  });
});

