import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
const { createMockSupabaseClient, resetMockDb, seedMockUser, TEST_JWT_SECRET } = require("../fixtures/mock-supabase");
const { createApp } = require("../../api/server");

let app;
beforeEach(() => {
  resetMockDb();
  app = createApp(createMockSupabaseClient());
});

function authHeader(username = "testuser", role = "user") {
  const token = jwt.sign({ username, role }, TEST_JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

describe("Topics API", () => {
  describe("POST /topics", () => {
    it("creates a topic when authenticated", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "My Topic" });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("My Topic");
      expect(res.body.creator).toBe("testuser");
      expect(res.body.created_at).toBeDefined();
    });

    it("returns 400 when name is empty", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when name is missing", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/topics")
        .send({ name: "Topic" });
      expect(res.status).toBe(401);
    });

    it("returns 409 for duplicate topic", async () => {
      seedMockUser("testuser", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "Duplicate" });
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "Duplicate" });
      expect(res.status).toBe(409);
    });

    it("trims topic name", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "  Trimmed Topic  " });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Trimmed Topic");
    });
  });

  describe("GET /topics", () => {
    it("returns all topics when authenticated", async () => {
      seedMockUser("testuser", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "Topic A" });
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "Topic B" });

      const res = await request(app)
        .get("/topics")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].name).toBeDefined();
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/topics");
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /topics/:name", () => {
    it("deletes a topic owned by the user", async () => {
      seedMockUser("testuser", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader())
        .send({ name: "To Delete" });

      const res = await request(app)
        .delete("/topics/To%20Delete")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it("returns 404 for non-existent topic", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .delete("/topics/NoTopic")
        .set("Authorization", authHeader());
      expect(res.status).toBe(404);
    });

    it("returns 403 when trying to delete another user's topic", async () => {
      seedMockUser("testuser", "Pass1234");
      seedMockUser("other", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("other"))
        .send({ name: "Other Topic" });

      const res = await request(app)
        .delete("/topics/Other%20Topic")
        .set("Authorization", authHeader("testuser"));
      expect(res.status).toBe(403);
    });

    it("admin can delete any topic", async () => {
      seedMockUser("testuser", "Pass1234");
      seedMockUser("admin", "Pass1234", "admin");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("testuser"))
        .send({ name: "User Topic" });

      const res = await request(app)
        .delete("/topics/User%20Topic")
        .set("Authorization", authHeader("admin", "admin"));
      expect(res.status).toBe(200);
    });
  });
});
