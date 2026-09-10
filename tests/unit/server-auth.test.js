import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
const { createMockSupabaseClient, resetMockDb, seedMockUser, TEST_JWT_SECRET } = require("../fixtures/mock-supabase");
const { createApp } = require("../../api/server");

let app;
beforeEach(() => {
  resetMockDb();
  app = createApp(createMockSupabaseClient());
});

describe("POST /auth/register", () => {
  it("registers a new user successfully", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "testuser", password: "Pass1234" });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("testuser");
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("returns 400 when username is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "Pass1234" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "testuser" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 409 when user already exists", async () => {
    seedMockUser("existing", "password123");
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "existing", password: "Pass1234" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("normalizes username to lowercase", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "TestUser", password: "Pass1234" });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("testuser");
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
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
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

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
