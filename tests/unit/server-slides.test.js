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

async function createTopicAndGetName(auth, name) {
  await request(app)
    .post("/topics")
    .set("Authorization", auth)
    .send({ name });
  return name;
}

describe("Slides API", () => {
  describe("POST /slides", () => {
    it("creates a slide when topic exists", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");

      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "Slide 1", desc: "Description" });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Slide 1");
      expect(res.body.topic).toBe("MyTopic");
      expect(res.body.desc).toBe("Description");
      expect(res.body.type).toBe("text");
      expect(res.body.creator).toBe("testuser");
    });

    it("returns 400 when title is missing", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");

      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when topic is missing", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ title: "Slide" });
      expect(res.status).toBe(400);
    });

    it("returns 404 when topic does not exist", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "Nonexistent", title: "Slide" });
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/slides")
        .send({ topic: "T", title: "S" });
      expect(res.status).toBe(401);
    });

    it("accepts desc as alias for description", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");

      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "Slide", desc: "via desc" });
      expect(res.status).toBe(201);
      expect(res.body.desc).toBe("via desc");
    });

    it("defaults type to text", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");

      const res = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "Slide" });
      expect(res.body.type).toBe("text");
    });
  });

  describe("GET /slides", () => {
    it("returns all slides", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");
      await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "Slide 1" });

      const res = await request(app)
        .get("/slides")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("filters by topic when query param provided", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "TopicA");
      await createTopicAndGetName(authHeader(), "TopicB");
      await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "TopicA", title: "Slide A" });
      await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "TopicB", title: "Slide B" });

      const res = await request(app)
        .get("/slides?topic=TopicA")
        .set("Authorization", authHeader());
      expect(res.body.length).toBe(1);
      expect(res.body[0].topic).toBe("TopicA");
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/slides");
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /slides/:id", () => {
    it("deletes a slide owned by the user", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");
      const createRes = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "To Delete" });
      const slideId = createRes.body.id;

      const res = await request(app)
        .delete(`/slides/${slideId}`)
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it("returns 400 for invalid id", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .delete("/slides/notanumber")
        .set("Authorization", authHeader());
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent slide", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .delete("/slides/99999")
        .set("Authorization", authHeader());
      expect(res.status).toBe(404);
    });

    it("returns 403 when trying to delete another user's slide", async () => {
      seedMockUser("testuser", "Pass1234");
      seedMockUser("other", "Pass1234");
      await createTopicAndGetName(authHeader("testuser"), "SharedTopic");
      const createRes = await request(app)
        .post("/slides")
        .set("Authorization", authHeader("testuser"))
        .send({ topic: "SharedTopic", title: "My Slide" });
      const slideId = createRes.body.id;

      const res = await request(app)
        .delete(`/slides/${slideId}`)
        .set("Authorization", authHeader("other"));
      expect(res.status).toBe(403);
    });

    it("admin can delete any slide", async () => {
      seedMockUser("testuser", "Pass1234");
      seedMockUser("admin", "Pass1234", "admin");
      await createTopicAndGetName(authHeader(), "MyTopic");
      const createRes = await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "User Slide" });
      const slideId = createRes.body.id;

      const res = await request(app)
        .delete(`/slides/${slideId}`)
        .set("Authorization", authHeader("admin", "admin"));
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /topics/:name/slides", () => {
    it("deletes all slides for a topic", async () => {
      seedMockUser("testuser", "Pass1234");
      await createTopicAndGetName(authHeader(), "MyTopic");
      await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "Slide 1" });
      await request(app)
        .post("/slides")
        .set("Authorization", authHeader())
        .send({ topic: "MyTopic", title: "Slide 2" });

      const res = await request(app)
        .delete("/topics/MyTopic/slides")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);

      const getRes = await request(app)
        .get("/slides?topic=MyTopic")
        .set("Authorization", authHeader());
      expect(getRes.body.length).toBe(0);
    });

    it("returns 404 for non-existent topic", async () => {
      seedMockUser("testuser", "Pass1234");
      const res = await request(app)
        .delete("/topics/NoTopic/slides")
        .set("Authorization", authHeader());
      expect(res.status).toBe(404);
    });
  });
});

describe("DELETE /all", () => {
  it("admin can delete all topics and slides", async () => {
    seedMockUser("admin", "Pass1234", "admin");
    seedMockUser("testuser", "Pass1234");
    await request(app)
      .post("/topics")
      .set("Authorization", authHeader())
      .send({ name: "Topic 1" });
    await request(app)
      .post("/topics")
      .set("Authorization", authHeader("admin", "admin"))
      .send({ name: "Admin Topic" });

    const res = await request(app)
      .delete("/all")
      .set("Authorization", authHeader("admin", "admin"));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const topicsRes = await request(app)
      .get("/topics")
      .set("Authorization", authHeader());
    expect(topicsRes.body.length).toBe(0);
  });

  it("non-admin cannot delete all", async () => {
    seedMockUser("testuser", "Pass1234");
    const res = await request(app)
      .delete("/all")
      .set("Authorization", authHeader());
    expect(res.status).toBe(403);
  });
});
