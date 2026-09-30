const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(__dirname, "../.env.test") });

const { TEST_JWT_SECRET } = require("../fixtures/mock-supabase");
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.SMTP_HOST = "";
