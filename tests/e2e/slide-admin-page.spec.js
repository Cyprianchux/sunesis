const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const ADMIN_USER = `admin_${Date.now()}`;
const ADMIN_PASS = "Admin1234";
const TEST_USER = `contentmgr_${Date.now()}`;
const TEST_PASS = "Test1234";

async function loginAs(page, username, password) {
  await page.goto(BASE_URL);
  await page.fill("#loginUser", username);
  await page.fill("#loginPass", password);
  await page.click("#loginBox button");
  await page.waitForURL("**/src/account", { timeout: 10000 });
}

test.describe("Content Manager Page (slide-admin.html)", () => {
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
    await page.close();
  });

  test("redirects to home when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/$/);
  });

  test("displays the Content Manager page after login", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.click('a[href="/src/slide-admin"]');
    await page.waitForURL("**/src/slide-admin", { timeout: 10000 });
    await expect(page.locator(".page-head h1")).toContainText("Content Manager");
  });

  test("has Create Topic section with input and button", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicName", { timeout: 5000 });
    await expect(page.locator("#topicName")).toBeVisible();
    await expect(page.locator("#createTopicBtn")).toBeVisible();
  });

  test("has Add Slide section with form fields", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await expect(page.locator("#topicSelect")).toBeVisible();
    await expect(page.locator("#slide-title")).toBeVisible();
    await expect(page.locator("#slide-desc")).toBeVisible();
    await expect(page.locator("#slide-media")).toBeVisible();
    await expect(page.locator("#addSlideBtn")).toBeVisible();
  });

  test("creates a topic and it appears in the select dropdown", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicName", { timeout: 5000 });
    const topicName = `TestTopic_${Date.now()}`;
    await page.fill("#topicName", topicName);
    await page.click("#createTopicBtn");
    await page.waitForTimeout(2000);
    const option = page.locator(`#topicSelect option[value="${topicName}"]`);
    await expect(option).toBeAttached();
  });

  test("shows error when creating topic with empty name", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicName", { timeout: 5000 });
    await page.click("#createTopicBtn");
    await page.waitForTimeout(1000);
    await expect(page.locator("#popup")).toContainText(/enter|required/i);
  });

  test("creates a slide under an existing topic", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicName", { timeout: 5000 });

    const topicName = `SlideTest_${Date.now()}`;
    await page.fill("#topicName", topicName);
    await page.click("#createTopicBtn");
    await page.waitForTimeout(2000);

    await page.selectOption("#topicSelect", topicName);
    await page.fill("#slide-title", "Test Slide Title");
    await page.fill("#slide-desc", "Test slide description content");
    await page.click("#addSlideBtn");
    await page.waitForTimeout(2000);
    await expect(page.locator("#popup")).toContainText(/success|added/i);
  });

  test("shows error when creating slide without topic or title", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#topicSelect", { timeout: 5000 });
    await page.click("#addSlideBtn");
    await page.waitForTimeout(1000);
    await expect(page.locator("#popup")).toContainText(/select|title|required/i);
  });

  test("existing topics and slides are displayed in the slide container", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#slideContainer", { timeout: 5000 });
    await page.waitForTimeout(2000);
    const container = page.locator("#slideContainer");
    await expect(container).toBeVisible();
  });

  test("has search bar with search functionality", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#searchInput", { timeout: 5000 });
    await page.fill("#searchInput", "test");
    await page.click("#searchBtn");
    await page.waitForTimeout(1000);
  });

  test("has navigation links (View, Board, Topics, Logout)", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#navLinks", { timeout: 5000 });
    const viewLink = page.locator('a[href="/src/slide-view"]');
    await expect(viewLink).toBeAttached();
    const boardLink = page.locator('a[href="/src/board"]');
    await expect(boardLink).toBeAttached();
  });

  test("delete all button is present", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#deleteAllBtn", { state: "attached", timeout: 5000 });
    await expect(page.locator("#deleteAllBtn")).toBeAttached();
  });

  test("floating add button exists", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#floatingAddBtn", { timeout: 5000 });
    await expect(page.locator("#floatingAddBtn")).toBeAttached();
  });

  test("panel toggle buttons work (maximize/minimize)", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector(".panel-toggle", { timeout: 5000 });
    const firstToggle = page.locator(".panel-toggle").first();
    await firstToggle.click();
    const panel = page.locator(".panel").first();
    await expect(panel).toHaveClass(/maximized/);
    await firstToggle.click();
    await expect(panel).not.toHaveClass(/maximized/);
  });

  test("navbar topics dropdown with select is present", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/slide-admin`);
    await page.waitForSelector("#navTopicSelect", { state: "attached", timeout: 5000 });
    await expect(page.locator("#navTopicSelect")).toBeAttached();
  });
});
