import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
const {
  createMockSupabaseClient,
  resetMockDb,
  seedMockUser,
  seedMockToken,
  db,
  TEST_JWT_SECRET,
} = require("../fixtures/mock-supabase");
const { createApp } = require("../../api/server");

let app;
beforeEach(() => {
  resetMockDb();
  app = createApp(createMockSupabaseClient());
});

function latestToken(type) {
  const match = [...db.tokens.entries()].find(([, t]) => t.type === type);
  return match ? match[1].token : null;
}

describe("POST /auth/register", () => {
  it("registers a new user successfully", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "testuser", email: "test@example.com", password: "Pass1234" });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("testuser");
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.email_verified).toBe(false);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("returns 400 when username is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "Pass1234" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "testuser", email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "testuser", password: "Pass1234" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "testuser", email: "not-an-email", password: "Pass1234" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });

  it("returns 409 when user already exists", async () => {
    seedMockUser("existing", "password123");
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "existing", email: "other@example.com", password: "Pass1234" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("returns 409 when email is already registered", async () => {
    seedMockUser("existing", "password123", "user", { email: "taken@example.com" });
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "newuser", email: "taken@example.com", password: "Pass1234" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email is already registered/i);
  });

  it("normalizes username to lowercase", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "TestUser", email: "test@example.com", password: "Pass1234" });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("testuser");
  });

  it("creates a verification token on registration", async () => {
    await request(app)
      .post("/auth/register")
      .send({ username: "testuser", email: "test@example.com", password: "Pass1234" });
    expect(latestToken("verify")).toBeTruthy();
  });
});

describe("POST /auth/register-local", () => {
  it("registers with valid password hash", async () => {
    const hash = crypto.createHash("sha256").update("Pass1234").digest("hex");
    const res = await request(app)
      .post("/auth/register-local")
      .send({ username: "localuser", passwordHash: hash });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("localuser");
  });

  it("returns 400 with invalid hash format", async () => {
    const res = await request(app)
      .post("/auth/register-local")
      .send({ username: "localuser", passwordHash: "not-a-hash" });
    expect(res.status).toBe(400);
  });

  it("returns 200 if user already exists (idempotent)", async () => {
    seedMockUser("existing", "pass");
    const hash = crypto.createHash("sha256").update("pass").digest("hex");
    const res = await request(app)
      .post("/auth/register-local")
      .send({ username: "existing", passwordHash: hash });
    expect(res.status).toBe(200);
  });
});

describe("POST /auth/login", () => {
  beforeEach(() => {
    seedMockUser("testuser", "Pass1234");
  });

  it("logs in with correct credentials and returns token", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "testuser", password: "Pass1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("testuser");
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.email_verified).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
  });

  it("returns email_verified false for unverified accounts", async () => {
    seedMockUser("unverified", "Pass1234", "user", { email_verified: false });
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "unverified", password: "Pass1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.email_verified).toBe(false);
  });

  it("returns 401 with wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "testuser", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it("returns 401 for non-existent user", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "nobody", password: "Pass1234" });
    expect(res.status).toBe(401);
  });

  it("normalizes username to lowercase on login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "TestUser", password: "Pass1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("testuser");
  });
});

describe("GET /auth/me", () => {
  it("returns current user with valid token", async () => {
    seedMockUser("testuser", "Pass1234");
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ username: "testuser", password: "Pass1234" });
    const token = loginRes.body.token;

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("testuser");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer invalidtoken123");
    expect(res.status).toBe(401);
  });

  it("returns 401 with expired token", async () => {
    const token = jwt.sign(
      { username: "testuser", role: "user" },
      TEST_JWT_SECRET,
      { expiresIn: "-1d" }
    );
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/verify-email", () => {
  it("verifies the email with a valid token", async () => {
    const email = "test@example.com";
    const token = crypto.randomBytes(32).toString("hex");
    seedMockUser("testuser", "Pass1234", "user", { email, email_verified: false });
    seedMockToken(token, "testuser", "verify", new Date(Date.now() + 60 * 60 * 1000).toISOString());

    const res = await request(app).get(`/auth/verify-email?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ username: "testuser", password: "Pass1234" });
    expect(loginRes.body.user.email_verified).toBe(true);
  });

  it("returns 400 without a token", async () => {
    const res = await request(app).get("/auth/verify-email");
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid token", async () => {
    const res = await request(app).get("/auth/verify-email?token=bogus");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it("returns 400 for an expired token", async () => {
    seedMockUser("testuser", "Pass1234", "user", { email_verified: false });
    seedMockToken("expiredverify", "testuser", "verify", new Date(Date.now() - 1000).toISOString());

    const res = await request(app).get("/auth/verify-email?token=expiredverify");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });
});

describe("POST /auth/forgot-password", () => {
  beforeEach(() => {
    seedMockUser("testuser", "Pass1234", "user", { email: "test@example.com" });
  });

  it("creates a reset token for a registered email and returns a generic message", async () => {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link has been sent/i);
    expect(latestToken("reset")).toBeTruthy();
  });

  it("does not reveal whether an unknown email is registered", async () => {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link has been sent/i);
    expect(latestToken("reset")).toBeNull();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });
});

describe("POST /auth/reset-password", () => {
  it("resets the password with a valid token", async () => {
    seedMockUser("testuser", "Pass1234", "user", { email: "test@example.com" });
    await request(app).post("/auth/forgot-password").send({ email: "test@example.com" });
    const token = latestToken("reset");
    expect(token).toBeTruthy();

    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword: "NewPass123" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset successfully/i);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ username: "testuser", password: "NewPass123" });
    expect(loginRes.status).toBe(200);
  });

  it("returns 400 with a weak password", async () => {
    seedMockToken("resettoken", "testuser", "reset");
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "resettoken", newPassword: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
  });

  it("returns 400 with an invalid token", async () => {
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "bogus", newPassword: "NewPass123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it("returns 400 with an expired token", async () => {
    seedMockToken("expiredreset", "testuser", "reset", new Date(Date.now() - 1000).toISOString());
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "expiredreset", newPassword: "NewPass123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });
});

describe("POST /auth/resend-verification", () => {
  function authHeader(username = "testuser") {
    return `Bearer ${jwt.sign({ username, role: "user" }, process.env.JWT_SECRET)}`;
  }

  it("sends a new verification email for an unverified account", async () => {
    seedMockUser("testuser", "Pass1234", "user", { email: "test@example.com", email_verified: false });
    const res = await request(app)
      .post("/auth/resend-verification")
      .set("Authorization", authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verification email sent/i);
    expect(latestToken("verify")).toBeTruthy();
  });

  it("returns 404 for an already verified account", async () => {
    seedMockUser("testuser", "Pass1234", "user", { email: "test@example.com", email_verified: true });
    const res = await request(app)
      .post("/auth/resend-verification")
      .set("Authorization", authHeader());
    expect(res.status).toBe(404);
  });

  it("does not accept a recipient email from the client", async () => {
    seedMockUser("testuser", "Pass1234", "user", { email: "test@example.com", email_verified: false });
    seedMockUser("otheruser", "Pass1234", "user", { email: "other@example.com", email_verified: false });
    const res = await request(app)
      .post("/auth/resend-verification")
      .set("Authorization", authHeader())
      .send({ email: "other@example.com" });
    expect(res.status).toBe(200);
    expect(latestToken("verify")).toBeTruthy();
    expect(db.tokens.get(latestToken("verify")).username).toBe("testuser");
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/auth/resend-verification");
    expect(res.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
