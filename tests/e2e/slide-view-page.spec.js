const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const TEST_USER = `slideview_${Date.now()}`;
const TEST_PASS = "Test1234";

async function loginAs(page, username, password) {
  await page.goto(BASE_URL);
  await page.fill("#loginUser", username);
  await page.fill("#loginPass", password);
  await page.click("#loginBox button");
  await page.waitForURL("**/src/account", { timeout: 10000 });
}

test.describe("Slide View Page (slide-view.html)", () => {
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
    await page.fill("#topicName", "SlideView Topic");
    await page.click("#createTopicBtn");
    await page.waitForTimeout(2000);

    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.fill("#slide-title", "First Slide");
    await page.fill("#slide-desc", "First slide content");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);

    await page.fill("#slide-title", "Second Slide");
    await page.fill("#slide-desc", "Second slide content");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);

    await page.close();
  });

  test("redirects to home when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/$/);
  });

  test("displays the slide viewer after login", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#slideDisplay", { timeout: 5000 });
    await expect(page.locator("#slideDisplay")).toBeVisible();
  });

  test("shows 'Select a topic' message by default", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#slideDisplay", { timeout: 5000 });
    await expect(page.locator("#slideDisplay")).toContainText("Select a topic");
  });

  test("has topic selection dropdown", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await expect(page.locator("#topicSelect")).toBeVisible();
  });

  test("selecting a topic shows slides", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.waitForTimeout(1000);
    const slideContent = page.locator(".slide-content");
    await expect(slideContent).toBeVisible();
  });

  test("displays slide counter text", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.waitForTimeout(1000);
    await expect(page.locator(".slide-content")).toContainText("Slide 1 of 2");
  });

  test("next arrow navigates to next slide", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.waitForTimeout(1000);
    await page.click("#nextArrow");
    await page.waitForTimeout(500);
    await expect(page.locator(".slide-content")).toContainText("Slide 2 of 2");
  });

  test("prev arrow navigates to previous slide", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.waitForTimeout(1000);
    await page.click("#nextArrow");
    await page.waitForTimeout(500);
    await page.click("#prevArrow");
    await page.waitForTimeout(500);
    await expect(page.locator(".slide-content")).toContainText("Slide 1 of 2");
  });

  test("prev arrow is disabled on first slide", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.waitForTimeout(1000);
    const prevArrow = page.locator("#prevArrow");
    await expect(prevArrow).toBeDisabled();
  });

  test("has search functionality", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#searchInput", { timeout: 5000 });
    await page.fill("#searchInput", "First");
    await page.click("#searchBtn");
    await page.waitForTimeout(1000);
  });

  test("has nav links to Web View, Setup, Board", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#navLinks", { timeout: 5000 });
    await expect(page.locator('a[href="/src/web-view"]')).toBeAttached();
    await expect(page.locator('a[href="/src/slide-admin"]')).toBeAttached();
    await expect(page.locator('a[href="/src/board"]')).toBeAttached();
  });

  test("handles empty topic selection", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "SlideView Topic");
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", "");
    await page.waitForTimeout(500);
    await expect(page.locator("#slideDisplay")).toContainText("Select a topic");
  });
});
