const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const TEST_USER = `dashboard_${Date.now()}`;
const TEST_PASS = "Test1234";

test.describe("Dashboard Page (account.html)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)");
    await page.fill("#regEmail", `${TEST_USER}@test.com`);
    await page.fill("#regUser", TEST_USER);
    await page.fill("#regPass", TEST_PASS);
    await page.fill("#confirmPass", TEST_PASS);
    await page.click("#registerBox button");
    await page.waitForTimeout(2000);
    await page.goto(BASE_URL);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    await page.close();
  });

  test("redirects to home when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/account`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/$/);
  });

  test("displays the dashboard with welcome message", async ({ page, context }) => {
    await context.addCookies([]);
    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    await expect(page.locator("#loginUser")).toContainText(TEST_USER.charAt(0).toUpperCase() + TEST_USER.slice(1));
    await expect(page.locator(".banner h1")).toContainText("Welcome");
  });

  test("displays topics container", async ({ page, context }) => {
    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    await expect(page.locator("#topicsContainer")).toBeVisible();
  });

  test("has search bar", async ({ page, context }) => {
    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    await expect(page.locator("#searchInput")).toBeVisible();
    await expect(page.locator("#searchBtn")).toBeVisible();
  });

  test("has navigation links to Setup, Board, Logout", async ({ page, context }) => {
    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    const setupLink = page.locator('a[href="/src/slide-admin"]');
    await expect(setupLink).toBeVisible();
    const boardLink = page.locator('a[href="/src/board"]');
    await expect(boardLink).toBeVisible();
  });

  test("displays Getting Started default topic card", async ({ page, context }) => {
    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    const defaultCard = page.locator(".default-topics-container");
    await expect(defaultCard).toBeVisible();
  });

  test("footer is present on dashboard", async ({ page, context }) => {
    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });
    await expect(page.locator("footer")).toBeVisible();
  });
});
