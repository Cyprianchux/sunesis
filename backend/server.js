require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createClient } = require("../../../../../../sunesis-V2/backend/node_modules/@supabase/supabase-js/src/lib/rest/types/common/common");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
app.use(cors());
app.use(express.json());

function hashPassword(password) {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

function createToken(user) {
  return jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing." });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired authorization token." });
  }
}

async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from("users")
    .select("username, role, password_hash")
    .eq("username", username)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

app.post("/auth/register", async (req, res) => {
  const { username, password, role = "user" } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);

  const existing = await getUserByUsername(normalizedUsername);
  if (existing) {
    return res.status(409).json({ message: "User already exists." });
  }

  const { error } = await supabase.from("users").insert([
    {
      username: normalizedUsername,
      password_hash: passwordHash,
      role,
    },
  ]);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json({ user: { username: normalizedUsername, role } });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const existing = await getUserByUsername(normalizedUsername);
  if (!existing) {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  const passwordHash = hashPassword(password);
  if (passwordHash !== existing.password_hash) {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  const token = createToken({ username: normalizedUsername, role: existing.role });
  return res.json({ user: { username: normalizedUsername, role: existing.role }, token });
});

app.get("/auth/me", authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

app.get("/topics", authenticate, async (req, res) => {
  const { data, error } = await supabase.from("topics").select("name, creator, created_at");
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
});

app.post("/topics", authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Topic name is required." });
  }

  const normalized = name.trim();
  const existing = await supabase.from("topics").select("name").eq("name", normalized).single();
  if (existing.error && existing.error.code !== "PGRST116") {
    return res.status(500).json({ message: existing.error.message });
  }

  if (existing.data) {
    return res.status(409).json({ message: "Topic already exists." });
  }

  const { error } = await supabase.from("topics").insert([
    {
      name: normalized,
      creator: req.user.username,
    },
  ]);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json({ name: normalized, creator: req.user.username });
});

app.delete("/topics/:name", authenticate, async (req, res) => {
  const topicName = req.params.name;
  const { data: existing, error: existingError } = await supabase
    .from("topics")
    .select("name, creator")
    .eq("name", topicName)
    .single();

  if (existingError && existingError.code !== "PGRST116") {
    return res.status(500).json({ message: existingError.message });
  }

  if (!existing) {
    return res.status(404).json({ message: "Topic not found." });
  }

  const isAdmin = req.user.role === "sunesis_admin";
  if (!isAdmin && existing.creator !== req.user.username) {
    return res.status(403).json({ message: "Forbidden: cannot delete this topic." });
  }

  const { error } = await supabase.from("topics").delete().eq("name", topicName);
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ message: "Topic deleted." });
});

app.get("/slides", authenticate, async (req, res) => {
  let query = supabase.from("slides").select("id, topic, title, description, media, type, creator, created_at");
  if (req.query.topic) {
    query = query.eq("topic", req.query.topic);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
});

app.post("/slides", authenticate, async (req, res) => {
  const { topic, title, description, media, type } = req.body;
  if (!topic || !title) {
    return res.status(400).json({ message: "Topic and title are required." });
  }

  const { data: topicData, error: topicError } = await supabase
    .from("topics")
    .select("name")
    .eq("name", topic)
    .single();

  if (topicError && topicError.code !== "PGRST116") {
    return res.status(500).json({ message: topicError.message });
  }

  if (!topicData) {
    return res.status(404).json({ message: "Topic does not exist." });
  }

  const { data, error } = await supabase.from("slides").insert([
    {
      topic,
      title,
      description,
      media,
      type,
      creator: req.user.username,
    },
  ]);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data[0]);
});

app.delete("/slides/:id", authenticate, async (req, res) => {
  const slideId = Number(req.params.id);
  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("id, creator")
    .eq("id", slideId)
    .single();

  if (slideError && slideError.code !== "PGRST116") {
    return res.status(500).json({ message: slideError.message });
  }

  if (!slide) {
    return res.status(404).json({ message: "Slide not found." });
  }

  const isAdmin = req.user.role === "sunesis_admin";
  if (!isAdmin && slide.creator !== req.user.username) {
    return res.status(403).json({ message: "Forbidden: cannot delete this slide." });
  }

  const { error } = await supabase.from("slides").delete().eq("id", slideId);
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ message: "Slide deleted." });
});

app.delete("/topics/:name/slides", authenticate, async (req, res) => {
  const topicName = req.params.name;
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("name, creator")
    .eq("name", topicName)
    .single();

  if (topicError && topicError.code !== "PGRST116") {
    return res.status(500).json({ message: topicError.message });
  }

  if (!topic) {
    return res.status(404).json({ message: "Topic not found." });
  }

  const isAdmin = req.user.role === "sunesis_admin";
  if (!isAdmin && topic.creator !== req.user.username) {
    return res.status(403).json({ message: "Forbidden: cannot delete slides for this topic." });
  }

  const { error } = await supabase.from("slides").delete().eq("topic", topicName);
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ message: "Slides deleted for topic." });
});

app.delete("/all", authenticate, async (req, res) => {
  if (req.user.role !== "sunesis_admin") {
    return res.status(403).json({ message: "Only admin can delete all content." });
  }

  const { error } = await supabase.from("slides").delete().neq("id", null);
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const { error: topicError } = await supabase.from("topics").delete().neq("name", null);
  if (topicError) {
    return res.status(500).json({ message: topicError.message });
  }

  return res.json({ message: "All topics and slides deleted." });
});

app.listen(PORT, () => {
  console.log(`Sunesis backend listening on port ${PORT}`);
});
