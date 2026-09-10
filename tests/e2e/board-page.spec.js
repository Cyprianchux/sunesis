const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const TEST_USER = `board_${Date.now()}`;
const TEST_PASS = "Test1234";

async function loginAs(page, username, password) {
  await page.goto(BASE_URL);
  await page.fill("#loginUser", username);
  await page.fill("#loginPass", password);
  await page.click("#loginBox button");
  await page.waitForURL("**/src/account", { timeout: 10000 });
}

test.describe("Board Page (board.html)", () => {
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
    await page.close();
  });

  test("redirects to home when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/$/);
  });

  test("displays the board screen after login", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await expect(page.locator("#boardScreen")).toBeVisible();
  });

  test("board screen is contenteditable", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await expect(page.locator("#boardScreen")).toHaveAttribute("contenteditable", "true");
  });

  test("can type text into the board", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await page.click("#boardScreen");
    await page.keyboard.type("Hello Sunesis Board!");
    await expect(page.locator("#boardScreen")).toContainText("Hello Sunesis Board!");
  });

  test("save button saves the write-up", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await page.click("#boardScreen");
    await page.keyboard.type("My saved note");
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click("#saveBoardBtn");
    await page.waitForTimeout(1000);
    await expect(page.locator("#popup")).toContainText(/saved/i);
  });

  test("saved notes dropdown shows saved entries", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#savedNotesSelect", { timeout: 5000 });
    await page.click("#boardScreen");
    await page.keyboard.type("Dropdown test note");
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click("#saveBoardBtn");
    await page.waitForTimeout(1000);
    const options = page.locator("#savedNotesSelect option");
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test("loading a saved note populates the board", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#savedNotesSelect", { timeout: 5000 });
    await page.click("#boardScreen");
    await page.keyboard.type("Loadable note");
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click("#saveBoardBtn");
    await page.waitForTimeout(1000);
    const secondOption = page.locator("#savedNotesSelect option").nth(1);
    await secondOption.evaluate((el) => (el.selected = true));
    await page.locator("#savedNotesSelect").dispatchEvent("change");
    await page.waitForTimeout(500);
    await expect(page.locator("#boardScreen")).toContainText("Loadable note");
  });

  test("has toolbar buttons (light toggle, font size, alignment, bullet)", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#lightToggleBtn", { timeout: 5000 });
    await expect(page.locator("#lightToggleBtn")).toBeVisible();
    await expect(page.locator("#fontIncreaseBtn")).toBeVisible();
    await expect(page.locator("#fontDecreaseBtn")).toBeVisible();
    await expect(page.locator("#alignLeftBtn")).toBeVisible();
    await expect(page.locator("#alignCenterBtn")).toBeVisible();
    await expect(page.locator("#bulletBtn")).toBeVisible();
  });

  test("light mode toggle works", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await page.click("#lightToggleBtn");
    await expect(page.locator("#boardScreen")).toHaveClass(/light-mode/);
    await page.click("#lightToggleBtn");
    await expect(page.locator("#boardScreen")).not.toHaveClass(/light-mode/);
  });

  test("font increase button increases font size", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    const initialFontSize = await page.locator("#boardScreen").evaluate(
      (el) => parseInt(window.getComputedStyle(el).fontSize)
    );
    await page.click("#fontIncreaseBtn");
    const newFontSize = await page.locator("#boardScreen").evaluate(
      (el) => parseInt(window.getComputedStyle(el).fontSize)
    );
    expect(newFontSize).toBeGreaterThan(initialFontSize);
  });

  test("font decrease button decreases font size", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    await page.click("#fontIncreaseBtn");
    await page.click("#fontIncreaseBtn");
    const beforeDecrease = await page.locator("#boardScreen").evaluate(
      (el) => parseInt(window.getComputedStyle(el).fontSize)
    );
    await page.click("#fontDecreaseBtn");
    const afterDecrease = await page.locator("#boardScreen").evaluate(
      (el) => parseInt(window.getComputedStyle(el).fontSize)
    );
    expect(afterDecrease).toBeLessThan(beforeDecrease);
  });

  test("font decrease has minimum limit", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#boardScreen", { timeout: 5000 });
    for (let i = 0; i < 20; i++) {
      await page.click("#fontDecreaseBtn");
    }
    const fontSize = await page.locator("#boardScreen").evaluate(
      (el) => parseInt(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  test("has control buttons (Save, Delete Last, Clear All)", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#saveBoardBtn", { timeout: 5000 });
    await expect(page.locator("#saveBoardBtn")).toBeVisible();
    await expect(page.locator("#deleteLastBtn")).toBeVisible();
    await expect(page.locator("#clearAllBtn")).toBeVisible();
  });

  test("has nav links (Slide View, Setup, Notes, Logout)", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector("#navLinks", { timeout: 5000 });
    await expect(page.locator('a[href="/src/slide-view"]')).toBeAttached();
    await expect(page.locator('a[href="/src/slide-admin"]')).toBeAttached();
  });

  test("board tip text is visible", async ({ page }) => {
    await loginAs(page, TEST_USER, TEST_PASS);
    await page.goto(`${BASE_URL}/src/board`);
    await page.waitForSelector(".board-tip", { timeout: 5000 });
    await expect(page.locator(".board-tip")).toContainText("Shift + Enter = Save");
  });
});
