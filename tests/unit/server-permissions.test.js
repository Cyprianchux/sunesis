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

describe("Permission & Access Control", () => {
  describe("role-based topic ownership", () => {
    it("topic records creator as authenticated user", async () => {
      seedMockUser("alice", "Pass1234");
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader("alice"))
        .send({ name: "Alice Topic" });
      expect(res.body.creator).toBe("alice");
    });

    it("prevents non-owner non-admin from deleting topic", async () => {
      seedMockUser("alice", "Pass1234");
      seedMockUser("bob", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("alice"))
        .send({ name: "Alice Topic" });

      const res = await request(app)
        .delete("/topics/Alice%20Topic")
        .set("Authorization", authHeader("bob"));
      expect(res.status).toBe(403);
    });
  });

  describe("role-based slide ownership", () => {
    it("slide records creator as authenticated user", async () => {
      seedMockUser("alice", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("alice"))
        .send({ name: "Alice Topic" });

      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader("alice"))
        .send({ topic: "Alice Topic", title: "My Slide" });
      expect(res.body.creator).toBe("alice");
    });

    it("prevents non-owner non-admin from deleting slide", async () => {
      seedMockUser("alice", "Pass1234");
      seedMockUser("bob", "Pass1234");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("alice"))
        .send({ name: "Alice Topic" });
      const slideRes = await request(app)
        .post("/slides")
        .set("Authorization", authHeader("alice"))
        .send({ topic: "Alice Topic", title: "Slide" });

      const res = await request(app)
        .delete(`/slides/${slideRes.body.id}`)
        .set("Authorization", authHeader("bob"));
      expect(res.status).toBe(403);
    });
  });

  describe("admin overrides", () => {
    it("admin can create and manage any topic", async () => {
      seedMockUser("admin", "Pass1234", "admin");
      const res = await request(app)
        .post("/topics")
        .set("Authorization", authHeader("admin", "admin"))
        .send({ name: "Admin Topic" });
      expect(res.status).toBe(201);
    });

    it("admin can delete another user's topic", async () => {
      seedMockUser("alice", "Pass1234");
      seedMockUser("admin", "Pass1234", "admin");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("alice"))
        .send({ name: "Alice Topic" });

      const res = await request(app)
        .delete("/topics/Alice%20Topic")
        .set("Authorization", authHeader("admin", "admin"));
      expect(res.status).toBe(200);
    });

    it("admin can delete another user's slide", async () => {
      seedMockUser("alice", "Pass1234");
      seedMockUser("admin", "Pass1234", "admin");
      await request(app)
        .post("/topics")
        .set("Authorization", authHeader("alice"))
        .send({ name: "Alice Topic" });
      const slideRes = await request(app)
        .post("/slides")
        .set("Authorization", authHeader("alice"))
        .send({ topic: "Alice Topic", title: "Slide" });

      const res = await request(app)
        .delete(`/slides/${slideRes.body.id}`)
        .set("Authorization", authHeader("admin", "admin"));
      expect(res.status).toBe(200);
    });
  });

  describe("unauthenticated access", () => {
    it("all protected routes return 401", async () => {
      const routes = [
        ["GET", "/topics"],
        ["POST", "/topics"],
        ["GET", "/slides"],
        ["POST", "/slides"],
        ["DELETE", "/all"],
      ];

      for (const [method, path] of routes) {
        const res = await request(app)[method.toLowerCase()](path);
        expect(res.status).toBe(401);
      }
    });
  });
});
