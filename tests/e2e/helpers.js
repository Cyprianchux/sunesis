const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function registerUser(page, username, password) {
  await page.goto(`${BASE_URL}`);
  await page.click(".toggle-link");
  await page.waitForSelector("#registerBox:not(.hidden)", { timeout: 5000 });
  await page.fill("#regUser", username);
  await page.fill("#regPass", password);
  await page.fill("#confirmPass", password);
  await page.click("#registerBox button");
  await page.waitForTimeout(2000);
}

async function loginUser(page, username, password) {
  await page.goto(`${BASE_URL}`);
  await page.waitForSelector("#loginBox", { timeout: 5000 });
  await page.fill("#loginUser", username);
  await page.fill("#loginPass", password);
  await page.click("#loginBox button");
  await page.waitForURL("**/src/account", { timeout: 10000 });
}

async function setAuthInStorage(context, username, role = "user") {
  await context.addCookies([]);
  await context.storageState();
}

module.exports = { registerUser, loginUser, setAuthInStorage, BASE_URL };
