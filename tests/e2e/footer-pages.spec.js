const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const TEST_USER = `footer_${Date.now()}`;
const TEST_PASS = "Test1234";

async function loginAs(page, username, password) {
  await page.goto(BASE_URL);
  await page.fill("#loginUser", username);
  await page.fill("#loginPass", password);
  await page.click("#loginBox button");
  await page.waitForURL("**/src/account", { timeout: 10000 });
}

const PAGES = [
  { key: "platform-overview", title: "Platform Overview" },
  { key: "solutions", title: "Solutions" },
  { key: "how-it-works", title: "How It Works" },
  { key: "safety-approach", title: "Safety Approach" },
  { key: "help-center", title: "Help Center" },
  { key: "guides", title: "Guides" },
  { key: "updates", title: "Updates" },
  { key: "community", title: "Community" },
  { key: "privacy-policy", title: "Privacy Policy" },
  { key: "terms-of-use", title: "Terms of Use" },
  { key: "cookies", title: "Cookies" },
  { key: "data-protection", title: "Data Protection" },
  { key: "about-sunesis", title: "About Sunesis" },
  { key: "contact", title: "Contact Us" },
  { key: "careers", title: "Careers" },
  { key: "partnerships", title: "Partnerships" },
];

test.describe("Footer Pages (footer-pages.html)", () => {
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

  test("is accessible when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/footer-pages?page=about-sunesis`);
    await expect(page.locator("#pageTitle")).toContainText("About Sunesis");
  });

  for (const { key, title } of PAGES) {
    test(`displays correct title for "${key}" page`, async ({ page }) => {
      await loginAs(page, TEST_USER, TEST_PASS);
      await page.goto(`${BASE_URL}/src/footer-pages?page=${key}`);
      await page.waitForSelector("#pageTitle", { timeout: 5000 });
      await expect(page.locator("#pageTitle")).toContainText(title);
    });
  }

  test("displays page intro text", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/footer-pages?page=about-sunesis`);
    await page.waitForSelector("#pageIntro", { timeout: 5000 });
    const intro = await page.locator("#pageIntro").textContent();
    expect(intro.length).toBeGreaterThan(0);
  });

  test("displays content cards", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/footer-pages?page=platform-overview`);
    await page.waitForSelector("#contentCards", { timeout: 5000 });
    const cards = page.locator("#contentCards section");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("has login/register link", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/footer-pages?page=about-sunesis`);
    await page.waitForSelector(".cta a", { timeout: 5000 });
    const loginLink = page.locator("a.primary");
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/");
  });

  test("has back to dashboard link", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/footer-pages?page=about-sunesis`);
    await page.waitForSelector(".cta a", { timeout: 5000 });
    const dashLink = page.locator("a.secondary");
    await expect(dashLink).toBeVisible();
    await expect(dashLink).toHaveAttribute("href", "/src/account");
  });

  test("back to dashboard links home when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/footer-pages?page=about-sunesis`);
    await expect(page.locator("a.secondary")).toHaveAttribute("href", "/");
  });

  test("footer copyright is displayed", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/footer-pages?page=about-sunesis`);
    await page.waitForSelector("footer", { timeout: 5000 });
    await expect(page.locator("footer")).toContainText("2026 Sunesis");
  });
});
