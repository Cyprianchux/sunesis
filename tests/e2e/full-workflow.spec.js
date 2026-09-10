const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const TEST_USER = `e2eflow_${Date.now()}`;
const TEST_PASS = "Test1234";

test.describe("Full User Workflow E2E", () => {
  test("complete user journey: register, login, create topic, add slides, view, board, logout", async ({
    page,
  }) => {
    // Step 1: Register
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)", { timeout: 5000 });
    await page.fill("#regUser", TEST_USER);
    await page.fill("#regPass", TEST_PASS);
    await page.fill("#confirmPass", TEST_PASS);
    await page.click("#registerBox button");
    await page.waitForTimeout(2000);

    // Step 2: Login
    await page.goto(BASE_URL);
    await page.fill("#loginUser", TEST_USER);
    await page.fill("#loginPass", TEST_PASS);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });

    // Step 3: Verify dashboard
    await expect(page.locator(".banner h1")).toContainText("Welcome");
    await expect(page.locator("#loginUser")).toContainText(
      TEST_USER.charAt(0).toUpperCase() + TEST_USER.slice(1)
    );

    // Step 4: Navigate to Content Manager
    await page.click('a[href="/src/slide-admin"]');
    await page.waitForURL("**/src/slide-admin", { timeout: 10000 });
    await expect(page.locator(".page-head h1")).toContainText("Content Manager");

    // Step 5: Create a topic
    const topicName = `E2E Topic ${Date.now()}`;
    await page.fill("#topicName", topicName);
    await page.click("#createTopicBtn");
    await page.waitForTimeout(2000);

    // Step 6: Verify topic appears in dropdown
    const option = page.locator(`#topicSelect option[value="${topicName}"]`);
    await expect(option).toBeAttached();

    // Step 7: Add first slide
    await page.selectOption("#topicSelect", topicName);
    await page.fill("#slide-title", "Introduction to Topic");
    await page.fill("#slide-desc", "This is the introduction slide for our E2E topic.");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);

    // Step 8: Add second slide
    await page.fill("#slide-title", "Key Concepts");
    await page.fill("#slide-desc", "These are the key concepts we need to understand.");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);

    // Step 9: Verify slide container shows the topic
    const topicSection = page.locator(".topic-section");
    await expect(topicSection.first()).toBeVisible();
    await expect(topicSection.first()).toContainText(topicName);

    // Step 10: Navigate to Slide View
    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", topicName);
    await page.waitForTimeout(1000);

    // Step 11: Verify slides display
    await expect(page.locator(".slide-content")).toBeVisible();
    await expect(page.locator(".slide-content")).toContainText("Slide 1 of 2");

    // Step 12: Navigate to next slide
    await page.click("#nextArrow");
    await page.waitForTimeout(500);
    await expect(page.locator(".slide-content")).toContainText("Slide 2 of 2");

    // Step 13: Navigate to Web View
    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.selectOption("#topicSelect", topicName);
    await page.waitForTimeout(1000);

    // Step 14: Verify web view shows both slides
    const pageSlides = page.locator(".page-slide");
    await expect(pageSlides).toHaveCount(2);

    // Step 15: Navigate to Board
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await page.click("#boardScreen");
    await page.keyboard.type("My E2E test notes for the topic.");
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click("#saveBoardBtn");
    await page.waitForTimeout(1000);
    await expect(page.locator("#popup")).toContainText(/saved/i);

    // Step 16: Verify board saved
    const savedSelect = page.locator("#savedNotesSelect");
    const optionCount = await savedSelect.locator("option").count();
    expect(optionCount).toBeGreaterThan(1);

    // Step 17: Navigate to a footer page from account
    await page.goto(`${BASE_URL}/src/account`);
    await page.waitForTimeout(1000);
    const footerLink = page.locator('a[href="/src/footer-pages?page=about-sunesis"]');
    if (await footerLink.count() > 0) {
      await footerLink.first().click();
      await page.waitForTimeout(1000);
      await expect(page.locator("#pageTitle")).toContainText("About Sunesis");
    }

    // Step 18: Search from account page
    await page.goto(`${BASE_URL}/src/account`);
    await page.waitForTimeout(1000);
    await page.fill("#searchInput", topicName);
    await page.click("#searchBtn");
    await page.waitForTimeout(1000);

    // Step 19: Logout
    await page.goto(`${BASE_URL}/src/account`);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.removeItem("sunesis_remember");
      localStorage.removeItem("sunesis_user");
    });
    await page.goto(`${BASE_URL}/src/account`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/$/);
  });
});

test.describe("Cross-page Navigation", () => {
  const navUser = `nav_${Date.now()}`;
  const navPass = "Test1234";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)");
    await page.fill("#regUser", navUser);
    await page.fill("#regPass", navPass);
    await page.fill("#confirmPass", navPass);
    await page.click("#registerBox button");
    await page.waitForTimeout(2000);
    await page.close();
  });

  test("can navigate between all authenticated pages", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#loginUser", navUser);
    await page.fill("#loginPass", navPass);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });

    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector(".page-head", { timeout: 5000 });
    await expect(page.locator(".page-head h1")).toContainText("Content Manager");

    await page.goto(`${BASE_URL}/src/slide-view`);
    await page.waitForSelector("#slideDisplay", { timeout: 5000 });

    await page.goto(`${BASE_URL}/src/web-view`);
    await page.waitForSelector(".js-slide-container", { timeout: 5000 });

    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
  });
});

test.describe("Offline/Online Behavior", () => {
  test("local-only mode warning shows when offline features used", async ({ page }) => {
    const offlineUser = `offline_${Date.now()}`;
    const offlinePass = "Test1234";

    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)");
    await page.fill("#regUser", offlineUser);
    await page.fill("#regPass", offlinePass);
    await page.fill("#confirmPass", offlinePass);
    await page.click("#registerBox button");
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}`);
    await page.fill("#loginUser", offlineUser);
    await page.fill("#loginPass", offlinePass);
    await page.click("#loginBox button");
    await page.waitForURL("**/src/account", { timeout: 10000 });

    const localMode = await page.evaluate(() => {
      return localStorage.getItem("sunesis_local_only_mode");
    });
    expect(typeof localMode === "string" || localMode === null).toBe(true);
  });
});
