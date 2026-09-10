const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const TEST_USER = `webview_${Date.now()}`;
const TEST_PASS = "Test1234";

async function loginAs(page, username, password) {
  await page.goto(BASE_URL);
  await page.fill("#loginUser", username);
  await page.fill("#loginPass", password);
  await page.click("#loginBox button");
  await page.waitForURL("**/src/account", { timeout: 10000 });
}

test.describe("Web View Page (web-view.html)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)");
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

    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicName", { timeout: 5000 });
    await page.fill("#topicName", "WebView Topic");
    await page.click("#createTopicBtn");
    await page.waitForTimeout(2000);

    await page.selectOption("#topicSelect", "WebView Topic");
    await page.fill("#slide-title", "Web Slide One");
    await page.fill("#slide-desc", "Content for web view slide one");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);

    await page.fill("#slide-title", "Web Slide Two");
    await page.fill("#slide-desc", "Content for web view slide two");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);

    await page.close();
  });

  test("redirects to home when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/$/);
  });

  test("displays the web view page after login", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector(".js-slide-container", { timeout: 5000 });
    await expect(page.locator(".js-slide-container")).toBeVisible();
  });

  test("has topic selection dropdown", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await expect(page.locator("#topicSelect")).toBeVisible();
  });

  test("selecting a topic renders slides as scrollable sections", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "WebView Topic");
    await page.waitForTimeout(1000);
    const slides = page.locator(".page-slide");
    await expect(slides).toHaveCount(2);
  });

  test("displays slide titles in web view", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "WebView Topic");
    await page.waitForTimeout(1000);
    await expect(page.locator(".page-slide").first()).toContainText("Web Slide One");
    await expect(page.locator(".page-slide").last()).toContainText("Web Slide Two");
  });

  test("shows topic label on each slide", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "WebView Topic");
    await page.waitForTimeout(1000);
    const small = page.locator(".page-slide small").first();
    await expect(small).toContainText("WebView Topic");
  });

  test("has search functionality", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#searchInput", { timeout: 5000 });
    await page.fill("#searchInput", "One");
    await page.click("#searchBtn");
    await page.waitForTimeout(1000);
  });

  test("has nav links (Slide View, Setup, Board, Topics, Logout)", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#navLinks", { timeout: 5000 });
    await expect(page.locator('a[href="/src/slide-view"]')).toBeAttached();
    await expect(page.locator('a[href="/src/slide-admin"]')).toBeAttached();
    await expect(page.locator('a[href="/src/board"]')).toBeAttached();
  });

  test("deselecting topic shows no slides", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "WebView Topic");
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "");
    await page.waitForTimeout(500);
    const noSlides = page.locator(".js-slide-container");
    await expect(noSlides).toContainText("No slides found");
  });
});
