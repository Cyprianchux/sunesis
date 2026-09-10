# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: board-page.spec.js >> Board Page (board.html) >> saved notes dropdown shows saved entries
- Location: tests\e2e\board-page.spec.js:74:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('#savedNotesSelect') to be visible
    13 × locator resolved to hidden <select id="savedNotesSelect">…</select>

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - generic [ref=f2e2]:
    - banner [ref=f2e3]:
      - link "Sunesis home" [ref=f2e4] [cursor=pointer]:
        - /url: /
        - generic [ref=f2e5]: sunesis
    - generic [ref=f2e6]:
      - textbox "Search..." [ref=f2e7]
      - button "Click to search" [ref=f2e8] [cursor=pointer]:
        - generic [ref=f2e9]: 
        - text: Click to search
    - list [ref=f2e11]:
      - listitem [ref=f2e12]:
        - link "Web view" [ref=f2e13] [cursor=pointer]:
          - /url: /src/slide-view
          - generic [ref=f2e14]: 
      - listitem [ref=f2e15]:
        - link "Manage slides" [ref=f2e16] [cursor=pointer]:
          - /url: /src/slide-admin
          - text: Setup
      - listitem [ref=f2e17] [cursor=pointer]: Notes ▾
      - listitem [ref=f2e18]:
        - link "Logout" [ref=f2e19] [cursor=pointer]:
          - /url: "#"
  - main [ref=f2e21]:
    - generic [ref=f2e22]:
      - generic [ref=f2e23]:
        - button "" [ref=f2e24] [cursor=pointer]
        - button "" [ref=f2e26] [cursor=pointer]
        - button "+" [ref=f2e28] [cursor=pointer]
        - button "" [ref=f2e30] [cursor=pointer]
        - button "" [ref=f2e32] [cursor=pointer]
        - button "" [ref=f2e34] [cursor=pointer]
      - generic [ref=f2e36]: Start typing here...
      - paragraph [ref=f2e37]: Enter = new line | Shift + Enter = Save
      - generic [ref=f2e38]:
        - button " Enter" [ref=f2e39] [cursor=pointer]:
          - generic [ref=f2e40]: 
          - text: Enter
        - button " Delete Last" [ref=f2e41] [cursor=pointer]:
          - generic [ref=f2e42]: 
          - text: Delete Last
        - button " Clear All" [ref=f2e43] [cursor=pointer]:
          - generic [ref=f2e44]: 
          - text: Clear All
```

# Test source

```ts
  1   | const { test, expect } = require("@playwright/test");
  2   | 
  3   | const BASE_URL = "http://localhost:3000";
  4   | 
  5   | const TEST_USER = `board_${Date.now()}`;
  6   | const TEST_PASS = "Test1234";
  7   | 
  8   | async function loginAs(page, username, password) {
  9   |   await page.goto(BASE_URL);
  10  |   await page.fill("#loginUser", username);
  11  |   await page.fill("#loginPass", password);
  12  |   await page.click("#loginBox button");
  13  |   await page.waitForURL("**/src/account", { timeout: 10000 });
  14  | }
  15  | 
  16  | test.describe("Board Page (board.html)", () => {
  17  |   test.beforeAll(async ({ browser }) => {
  18  |     const page = await browser.newPage();
  19  |     await page.goto(BASE_URL);
  20  |     await page.click(".toggle-link");
  21  |     await page.waitForSelector("#registerBox:not(.hidden)");
  22  |     await page.fill("#regUser", TEST_USER);
  23  |     await page.fill("#regPass", TEST_PASS);
  24  |     await page.fill("#confirmPass", TEST_PASS);
  25  |     await page.click("#registerBox button");
  26  |     await page.waitForTimeout(2000);
  27  |     await page.close();
  28  |   });
  29  | 
  30  |   test("redirects to home when not logged in", async ({ page }) => {
  31  |     await page.goto(`${BASE_URL}/src/board`);
  32  |     await page.waitForTimeout(2000);
  33  |     const url = page.url();
  34  |     expect(url).toMatch(/\/$/);
  35  |   });
  36  | 
  37  |   test("displays the board screen after login", async ({ page }) => {
  38  |     await loginAs(page, TEST_USER, TEST_PASS);
  39  |     await page.goto(`${BASE_URL}/src/board`);
  40  |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  41  |     await expect(page.locator("#boardScreen")).toBeVisible();
  42  |   });
  43  | 
  44  |   test("board screen is contenteditable", async ({ page }) => {
  45  |     await loginAs(page, TEST_USER, TEST_PASS);
  46  |     await page.goto(`${BASE_URL}/src/board`);
  47  |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  48  |     await expect(page.locator("#boardScreen")).toHaveAttribute("contenteditable", "true");
  49  |   });
  50  | 
  51  |   test("can type text into the board", async ({ page }) => {
  52  |     await loginAs(page, TEST_USER, TEST_PASS);
  53  |     await page.goto(`${BASE_URL}/src/board`);
  54  |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  55  |     await page.click("#boardScreen");
  56  |     await page.keyboard.type("Hello Sunesis Board!");
  57  |     await expect(page.locator("#boardScreen")).toContainText("Hello Sunesis Board!");
  58  |   });
  59  | 
  60  |   test("save button saves the write-up", async ({ page }) => {
  61  |     await loginAs(page, TEST_USER, TEST_PASS);
  62  |     await page.goto(`${BASE_URL}/src/board`);
  63  |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  64  |     await page.click("#boardScreen");
  65  |     await page.keyboard.type("My saved note");
  66  |     page.on("dialog", async (dialog) => {
  67  |       await dialog.accept();
  68  |     });
  69  |     await page.click("#saveBoardBtn");
  70  |     await page.waitForTimeout(1000);
  71  |     await expect(page.locator("#popup")).toContainText(/saved/i);
  72  |   });
  73  | 
  74  |   test("saved notes dropdown shows saved entries", async ({ page }) => {
  75  |     await loginAs(page, TEST_USER, TEST_PASS);
  76  |     await page.goto(`${BASE_URL}/src/board`);
> 77  |     await page.waitForSelector("#savedNotesSelect", { timeout: 5000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  78  |     await page.click("#boardScreen");
  79  |     await page.keyboard.type("Dropdown test note");
  80  |     page.on("dialog", async (dialog) => {
  81  |       await dialog.accept();
  82  |     });
  83  |     await page.click("#saveBoardBtn");
  84  |     await page.waitForTimeout(1000);
  85  |     const options = page.locator("#savedNotesSelect option");
  86  |     const count = await options.count();
  87  |     expect(count).toBeGreaterThan(1);
  88  |   });
  89  | 
  90  |   test("loading a saved note populates the board", async ({ page }) => {
  91  |     await loginAs(page, TEST_USER, TEST_PASS);
  92  |     await page.goto(`${BASE_URL}/src/board`);
  93  |     await page.waitForSelector("#savedNotesSelect", { timeout: 5000 });
  94  |     await page.click("#boardScreen");
  95  |     await page.keyboard.type("Loadable note");
  96  |     page.on("dialog", async (dialog) => {
  97  |       await dialog.accept();
  98  |     });
  99  |     await page.click("#saveBoardBtn");
  100 |     await page.waitForTimeout(1000);
  101 |     const secondOption = page.locator("#savedNotesSelect option").nth(1);
  102 |     await secondOption.evaluate((el) => (el.selected = true));
  103 |     await page.locator("#savedNotesSelect").dispatchEvent("change");
  104 |     await page.waitForTimeout(500);
  105 |     await expect(page.locator("#boardScreen")).toContainText("Loadable note");
  106 |   });
  107 | 
  108 |   test("has toolbar buttons (light toggle, font size, alignment, bullet)", async ({ page }) => {
  109 |     await loginAs(page, TEST_USER, TEST_PASS);
  110 |     await page.goto(`${BASE_URL}/src/board`);
  111 |     await page.waitForSelector("#lightToggleBtn", { timeout: 5000 });
  112 |     await expect(page.locator("#lightToggleBtn")).toBeVisible();
  113 |     await expect(page.locator("#fontIncreaseBtn")).toBeVisible();
  114 |     await expect(page.locator("#fontDecreaseBtn")).toBeVisible();
  115 |     await expect(page.locator("#alignLeftBtn")).toBeVisible();
  116 |     await expect(page.locator("#alignCenterBtn")).toBeVisible();
  117 |     await expect(page.locator("#bulletBtn")).toBeVisible();
  118 |   });
  119 | 
  120 |   test("light mode toggle works", async ({ page }) => {
  121 |     await loginAs(page, TEST_USER, TEST_PASS);
  122 |     await page.goto(`${BASE_URL}/src/board`);
  123 |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  124 |     await page.click("#lightToggleBtn");
  125 |     await expect(page.locator("#boardScreen")).toHaveClass(/light-mode/);
  126 |     await page.click("#lightToggleBtn");
  127 |     await expect(page.locator("#boardScreen")).not.toHaveClass(/light-mode/);
  128 |   });
  129 | 
  130 |   test("font increase button increases font size", async ({ page }) => {
  131 |     await loginAs(page, TEST_USER, TEST_PASS);
  132 |     await page.goto(`${BASE_URL}/src/board`);
  133 |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  134 |     const initialFontSize = await page.locator("#boardScreen").evaluate(
  135 |       (el) => parseInt(window.getComputedStyle(el).fontSize)
  136 |     );
  137 |     await page.click("#fontIncreaseBtn");
  138 |     const newFontSize = await page.locator("#boardScreen").evaluate(
  139 |       (el) => parseInt(window.getComputedStyle(el).fontSize)
  140 |     );
  141 |     expect(newFontSize).toBeGreaterThan(initialFontSize);
  142 |   });
  143 | 
  144 |   test("font decrease button decreases font size", async ({ page }) => {
  145 |     await loginAs(page, TEST_USER, TEST_PASS);
  146 |     await page.goto(`${BASE_URL}/src/board`);
  147 |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  148 |     await page.click("#fontIncreaseBtn");
  149 |     await page.click("#fontIncreaseBtn");
  150 |     const beforeDecrease = await page.locator("#boardScreen").evaluate(
  151 |       (el) => parseInt(window.getComputedStyle(el).fontSize)
  152 |     );
  153 |     await page.click("#fontDecreaseBtn");
  154 |     const afterDecrease = await page.locator("#boardScreen").evaluate(
  155 |       (el) => parseInt(window.getComputedStyle(el).fontSize)
  156 |     );
  157 |     expect(afterDecrease).toBeLessThan(beforeDecrease);
  158 |   });
  159 | 
  160 |   test("font decrease has minimum limit", async ({ page }) => {
  161 |     await loginAs(page, TEST_USER, TEST_PASS);
  162 |     await page.goto(`${BASE_URL}/src/board`);
  163 |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  164 |     for (let i = 0; i < 20; i++) {
  165 |       await page.click("#fontDecreaseBtn");
  166 |     }
  167 |     const fontSize = await page.locator("#boardScreen").evaluate(
  168 |       (el) => parseInt(window.getComputedStyle(el).fontSize)
  169 |     );
  170 |     expect(fontSize).toBeGreaterThanOrEqual(20);
  171 |   });
  172 | 
  173 |   test("has control buttons (Save, Delete Last, Clear All)", async ({ page }) => {
  174 |     await loginAs(page, TEST_USER, TEST_PASS);
  175 |     await page.goto(`${BASE_URL}/src/board`);
  176 |     await page.waitForSelector("#saveBoardBtn", { timeout: 5000 });
  177 |     await expect(page.locator("#saveBoardBtn")).toBeVisible();
```