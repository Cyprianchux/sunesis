# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-workflow.spec.js >> Full User Workflow E2E >> complete user journey: register, login, create topic, add slides, view, board, logout
- Location: tests\e2e\full-workflow.spec.js:9:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('#topicSelect') to be visible
    12 × locator resolved to hidden <select id="topicSelect">…</select>

```

# Page snapshot

```yaml
- generic [active] [ref=f4e1]:
  - generic [ref=f4e2]:
    - banner [ref=f4e3]:
      - link "Sunesis home" [ref=f4e4] [cursor=pointer]:
        - /url: /
        - generic [ref=f4e5]: sunesis
    - generic [ref=f4e6]:
      - textbox "Search..." [ref=f4e7]
      - button "Click to search" [ref=f4e8] [cursor=pointer]:
        - generic [ref=f4e9]: 
        - text: Click to search
    - list [ref=f4e11]:
      - listitem [ref=f4e12]:
        - link "Web view" [ref=f4e13] [cursor=pointer]:
          - /url: /src/web-view
          - generic [ref=f4e14]: 
      - listitem [ref=f4e15]:
        - link "Manage slides" [ref=f4e16] [cursor=pointer]:
          - /url: /src/slide-admin
          - text: Setup
      - listitem [ref=f4e17]:
        - link "Board" [ref=f4e18] [cursor=pointer]:
          - /url: /src/board
      - listitem [ref=f4e19] [cursor=pointer]: Topics ▾
      - listitem [ref=f4e20]:
        - link "Logout" [ref=f4e21] [cursor=pointer]:
          - /url: "#"
  - main [ref=f4e22]:
    - generic [ref=f4e24]:
      - button "❮" [disabled] [ref=f4e25]
      - button "❯" [disabled] [ref=f4e26]
      - paragraph [ref=f4e27]: Select a topic to view slides
```

# Test source

```ts
  1   | const { test, expect } = require("@playwright/test");
  2   | 
  3   | const BASE_URL = "http://localhost:3000";
  4   | 
  5   | const TEST_USER = `e2eflow_${Date.now()}`;
  6   | const TEST_PASS = "Test1234";
  7   | 
  8   | test.describe("Full User Workflow E2E", () => {
  9   |   test("complete user journey: register, login, create topic, add slides, view, board, logout", async ({
  10  |     page,
  11  |   }) => {
  12  |     // Step 1: Register
  13  |     await page.goto(BASE_URL);
  14  |     await page.click(".toggle-link");
  15  |     await page.waitForSelector("#registerBox:not(.hidden)", { timeout: 5000 });
  16  |     await page.fill("#regUser", TEST_USER);
  17  |     await page.fill("#regPass", TEST_PASS);
  18  |     await page.fill("#confirmPass", TEST_PASS);
  19  |     await page.click("#registerBox button");
  20  |     await page.waitForTimeout(2000);
  21  | 
  22  |     // Step 2: Login
  23  |     await page.goto(BASE_URL);
  24  |     await page.fill("#loginUser", TEST_USER);
  25  |     await page.fill("#loginPass", TEST_PASS);
  26  |     await page.click("#loginBox button");
  27  |     await page.waitForURL("**/src/account", { timeout: 10000 });
  28  | 
  29  |     // Step 3: Verify dashboard
  30  |     await expect(page.locator(".banner h1")).toContainText("Welcome");
  31  |     await expect(page.locator("#loginUser")).toContainText(
  32  |       TEST_USER.charAt(0).toUpperCase() + TEST_USER.slice(1)
  33  |     );
  34  | 
  35  |     // Step 4: Navigate to Content Manager
  36  |     await page.click('a[href="/src/slide-admin"]');
  37  |     await page.waitForURL("**/src/slide-admin", { timeout: 10000 });
  38  |     await expect(page.locator(".page-head h1")).toContainText("Content Manager");
  39  | 
  40  |     // Step 5: Create a topic
  41  |     const topicName = `E2E Topic ${Date.now()}`;
  42  |     await page.fill("#topicName", topicName);
  43  |     await page.click("#createTopicBtn");
  44  |     await page.waitForTimeout(2000);
  45  | 
  46  |     // Step 6: Verify topic appears in dropdown
  47  |     const option = page.locator(`#topicSelect option[value="${topicName}"]`);
  48  |     await expect(option).toBeAttached();
  49  | 
  50  |     // Step 7: Add first slide
  51  |     await page.selectOption("#topicSelect", topicName);
  52  |     await page.fill("#slide-title", "Introduction to Topic");
  53  |     await page.fill("#slide-desc", "This is the introduction slide for our E2E topic.");
  54  |     await page.click("#addSlideBtn");
  55  |     await page.waitForTimeout(2000);
  56  | 
  57  |     // Step 8: Add second slide
  58  |     await page.fill("#slide-title", "Key Concepts");
  59  |     await page.fill("#slide-desc", "These are the key concepts we need to understand.");
  60  |     await page.click("#addSlideBtn");
  61  |     await page.waitForTimeout(2000);
  62  | 
  63  |     // Step 9: Verify slide container shows the topic
  64  |     const topicSection = page.locator(".topic-section");
  65  |     await expect(topicSection.first()).toBeVisible();
  66  |     await expect(topicSection.first()).toContainText(topicName);
  67  | 
  68  |     // Step 10: Navigate to Slide View
  69  |     await page.goto(`${BASE_URL}/src/slide-view`);
> 70  |     await page.waitForSelector("#topicSelect", { timeout: 5000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  71  |     await page.waitForTimeout(1000);
  72  |     await page.selectOption("#topicSelect", topicName);
  73  |     await page.waitForTimeout(1000);
  74  | 
  75  |     // Step 11: Verify slides display
  76  |     await expect(page.locator(".slide-content")).toBeVisible();
  77  |     await expect(page.locator(".slide-content")).toContainText("Slide 1 of 2");
  78  | 
  79  |     // Step 12: Navigate to next slide
  80  |     await page.click("#nextArrow");
  81  |     await page.waitForTimeout(500);
  82  |     await expect(page.locator(".slide-content")).toContainText("Slide 2 of 2");
  83  | 
  84  |     // Step 13: Navigate to Web View
  85  |     await page.goto(`${BASE_URL}/src/web-view`);
  86  |     await page.waitForSelector("#topicSelect", { timeout: 5000 });
  87  |     await page.waitForTimeout(1000);
  88  |     await page.selectOption("#topicSelect", topicName);
  89  |     await page.waitForTimeout(1000);
  90  | 
  91  |     // Step 14: Verify web view shows both slides
  92  |     const pageSlides = page.locator(".page-slide");
  93  |     await expect(pageSlides).toHaveCount(2);
  94  | 
  95  |     // Step 15: Navigate to Board
  96  |     await page.goto(`${BASE_URL}/src/board`);
  97  |     await page.waitForSelector("#boardScreen", { timeout: 5000 });
  98  |     await page.click("#boardScreen");
  99  |     await page.keyboard.type("My E2E test notes for the topic.");
  100 |     page.on("dialog", async (dialog) => {
  101 |       await dialog.accept();
  102 |     });
  103 |     await page.click("#saveBoardBtn");
  104 |     await page.waitForTimeout(1000);
  105 |     await expect(page.locator("#popup")).toContainText(/saved/i);
  106 | 
  107 |     // Step 16: Verify board saved
  108 |     const savedSelect = page.locator("#savedNotesSelect");
  109 |     const optionCount = await savedSelect.locator("option").count();
  110 |     expect(optionCount).toBeGreaterThan(1);
  111 | 
  112 |     // Step 17: Navigate to a footer page from account
  113 |     await page.goto(`${BASE_URL}/src/account`);
  114 |     await page.waitForTimeout(1000);
  115 |     const footerLink = page.locator('a[href="/src/footer-pages?page=about-sunesis"]');
  116 |     if (await footerLink.count() > 0) {
  117 |       await footerLink.first().click();
  118 |       await page.waitForTimeout(1000);
  119 |       await expect(page.locator("#pageTitle")).toContainText("About Sunesis");
  120 |     }
  121 | 
  122 |     // Step 18: Search from account page
  123 |     await page.goto(`${BASE_URL}/src/account`);
  124 |     await page.waitForTimeout(1000);
  125 |     await page.fill("#searchInput", topicName);
  126 |     await page.click("#searchBtn");
  127 |     await page.waitForTimeout(1000);
  128 | 
  129 |     // Step 19: Logout
  130 |     await page.goto(`${BASE_URL}/src/account`);
  131 |     await page.waitForTimeout(500);
  132 |     await page.evaluate(() => {
  133 |       sessionStorage.clear();
  134 |       localStorage.removeItem("sunesis_remember");
  135 |       localStorage.removeItem("sunesis_user");
  136 |     });
  137 |     await page.goto(`${BASE_URL}/src/account`);
  138 |     await page.waitForTimeout(2000);
  139 |     const url = page.url();
  140 |     expect(url).toMatch(/\/$/);
  141 |   });
  142 | });
  143 | 
  144 | test.describe("Cross-page Navigation", () => {
  145 |   const navUser = `nav_${Date.now()}`;
  146 |   const navPass = "Test1234";
  147 | 
  148 |   test.beforeAll(async ({ browser }) => {
  149 |     const page = await browser.newPage();
  150 |     await page.goto(BASE_URL);
  151 |     await page.click(".toggle-link");
  152 |     await page.waitForSelector("#registerBox:not(.hidden)");
  153 |     await page.fill("#regUser", navUser);
  154 |     await page.fill("#regPass", navPass);
  155 |     await page.fill("#confirmPass", navPass);
  156 |     await page.click("#registerBox button");
  157 |     await page.waitForTimeout(2000);
  158 |     await page.close();
  159 |   });
  160 | 
  161 |   test("can navigate between all authenticated pages", async ({ page }) => {
  162 |     await page.goto(BASE_URL);
  163 |     await page.fill("#loginUser", navUser);
  164 |     await page.fill("#loginPass", navPass);
  165 |     await page.click("#loginBox button");
  166 |     await page.waitForURL("**/src/account", { timeout: 10000 });
  167 | 
  168 |     await page.goto(`${BASE_URL}/src/slide-admin`);
  169 |     await page.waitForSelector(".page-head", { timeout: 5000 });
  170 |     await expect(page.locator(".page-head h1")).toContainText("Content Manager");
```