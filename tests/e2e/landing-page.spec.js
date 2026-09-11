const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

test.describe("Landing Page (index.html)", () => {
  test("loads the page with correct title", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Sunesis/);
  });

  test("displays hero section with heading", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator(".page-title")).toBeVisible();
    await expect(page.locator(".page-title")).toContainText("Turn information into");
  });

  test("displays the brand logo and name", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator(".brand span")).toContainText("sunesis");
  });

  test("displays feature boxes section", async ({ page }) => {
    await page.goto(BASE_URL);
    const features = page.locator(".feature-box");
    await expect(features).toHaveCount(12);
  });

  test("displays login form by default", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("#loginBox")).toBeVisible();
    await expect(page.locator("#registerBox")).toHaveClass(/hidden/);
  });

  test("sign in link scrolls to auth section", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".header-link");
    await expect(page.locator("#auth-section")).toBeInViewport();
  });

  test("get started button scrolls to auth and shows register", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".hero-cta");
    await expect(page.locator("#registerBox")).toBeVisible();
  });

  test("login form has username and password fields", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("#loginUser")).toBeVisible();
    await expect(page.locator("#loginPass")).toBeVisible();
  });

  test("toggle password visibility works", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("#loginPass")).toHaveAttribute("type", "password");
    await page.click("#loginBox .toggle-password");
    await expect(page.locator("#loginPass")).toHaveAttribute("type", "text");
    await page.click("#loginBox .toggle-password");
    await expect(page.locator("#loginPass")).toHaveAttribute("type", "password");
  });

  test("switching to register form shows registration fields", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await expect(page.locator("#registerBox")).toBeVisible();
    await expect(page.locator("#loginBox")).toHaveClass(/hidden/);
    await expect(page.locator("#regUser")).toBeVisible();
    await expect(page.locator("#regPass")).toBeVisible();
    await expect(page.locator("#confirmPass")).toBeVisible();
  });

  test("switching back to login from register", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await expect(page.locator("#registerBox")).toBeVisible();
    await page.click("#registerBox .toggle-link");
    await expect(page.locator("#loginBox")).toBeVisible();
  });

  test("password validation rules appear on register form", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await expect(page.locator("#registerRules")).toBeVisible();
    await expect(page.locator("#reg-length")).toBeVisible();
    await expect(page.locator("#reg-uppercase")).toBeVisible();
    await expect(page.locator("#reg-number")).toBeVisible();
  });

  test("footer links are visible", async ({ page }) => {
    await page.goto(BASE_URL);
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.locator("a")).toHaveCount(16);
  });

  test("feature highlight card has CTA button", async ({ page }) => {
    await page.goto(BASE_URL);
    const highlight = page.locator(".feature-box.highlight");
    await expect(highlight).toBeVisible();
    await expect(highlight.locator(".cta-btn")).toBeVisible();
  });
});

test.describe("Registration Flow", () => {
  const uniqueUser = `e2euser_${Date.now()}`;

  test("registers a new user successfully", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)", { timeout: 5000 });
    await page.fill("#regEmail", `${uniqueUser}@test.com`);
    await page.fill("#regUser", uniqueUser);
    await page.fill("#regPass", "Test1234");
    await page.fill("#confirmPass", "Test1234");
    await page.click("#registerBox button");
    await page.waitForTimeout(2000);
    await expect(page.locator("#loginBox")).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)");
    await page.fill("#regEmail", "testuser2@test.com");
    await page.fill("#regUser", "testuser2");
    await page.fill("#regPass", "Test1234");
    await page.fill("#confirmPass", "Different123");
    await page.click("#registerBox button");
    await page.waitForTimeout(1000);
    const popup = page.locator("#popup");
    await expect(popup).toContainText("do not match");
  });

  test("shows error for missing fields", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click(".toggle-link");
    await page.waitForSelector("#registerBox:not(.hidden)");
    await page.click("#registerBox button");
    await page.waitForTimeout(1000);
    const popup = page.locator("#popup");
    await expect(popup).toContainText("required");
  });
});

test.describe("Login Flow", () => {
  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#loginUser", "nonexistent");
    await page.fill("#loginPass", "Wrong1234");
    await page.click("#loginBox button");
    await page.waitForTimeout(2000);
    const popup = page.locator("#popup");
    await expect(popup).toContainText("Invalid");
  });
});

test.describe("Remember Me Checkbox", () => {
  test("remember me checkbox is present and unchecked", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("#rememberMe")).toBeVisible();
    await expect(page.locator("#rememberMe")).not.toBeChecked();
  });

  test("remember me checkbox can be toggled", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.check("#rememberMe");
    await expect(page.locator("#rememberMe")).toBeChecked();
    await page.uncheck("#rememberMe");
    await expect(page.locator("#rememberMe")).not.toBeChecked();
  });
});
