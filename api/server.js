require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  PORT = 3000,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and JWT_SECRET are required.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

// Vercel rewrites /api/* to this function without removing the /api prefix.
// Normalize it before Express matches the endpoint routes.
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/")) {
    req.url = req.url.slice(4) || "/";
  }
  next();
});

const ADMIN_ROLE = "admin";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function isAdmin(user) {
  return user.role === ADMIN_ROLE;
}

function createToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing." });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired authorization token." });
  }
}

function handleError(res, error) {
  console.error(error);
  return res.status(500).json({ message: "A database error occurred." });
}

async function getUser(username) {
  const { data, error } = await supabase
    .from("users")
    .select("username, role, password_hash")
    .eq("username", normalizeUsername(username))
    .maybeSingle();
  if (error) throw error;
  return data;
}

function topicResponse(topic) {
  return {
    name: topic.name,
    creator: topic.creator,
    created_at: topic.created_at,
  };
}

function slideResponse(slide) {
  return {
    id: slide.id,
    topic: slide.topic,
    title: slide.title,
    desc: slide.description || "",
    media: slide.media || "",
    type: slide.type || "text",
    creator: slide.creator,
    created_at: slide.created_at,
  };
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/auth/register", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");
    const role = "user";

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (await getUser(username)) {
      return res.status(409).json({ message: "User already exists." });
    }

    const { data, error } = await supabase
      .from("users")
      .insert({ username, password_hash: hashPassword(password), role })
      .select("username, role")
      .single();
    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ message: "User already exists." });
      }
      throw error;
    }
    return res.status(201).json({ user: data });
  } catch (error) {
    return handleError(res, error);
  }
});

app.post("/auth/register-local", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const passwordHash = String(req.body.passwordHash || "");
    const role = "user";
    if (!username || !/^[a-f0-9]{64}$/i.test(passwordHash)) {
      return res.status(400).json({ message: "Valid username and password hash are required." });
    }
    if (await getUser(username)) return res.status(200).json({ message: "User already exists." });

    const { error } = await supabase
      .from("users")
      .insert({ username, password_hash: passwordHash.toLowerCase(), role });
    if (error) {
      if (error.code === "23505") return res.status(200).json({ message: "User already exists." });
      throw error;
    }
    return res.status(201).json({ user: { username, role } });
  } catch (error) {
    return handleError(res, error);
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");
    const user = await getUser(username);

    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const safeUser = { username: user.username, role: user.role };
    return res.json({ user: safeUser, token: createToken(safeUser) });
  } catch (error) {
    return handleError(res, error);
  }
});

app.get("/auth/me", authenticate, (req, res) => res.json({ user: req.user }));

app.get("/topics", authenticate, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("topics")
      .select("name, creator, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json((data || []).map(topicResponse));
  } catch (error) {
    return handleError(res, error);
  }
});

app.post("/topics", authenticate, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Topic name is required." });

    const { data, error } = await supabase
      .from("topics")
      .insert({ name, creator: req.user.username })
      .select("name, creator, created_at")
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ message: "Topic already exists." });
      throw error;
    }
    return res.status(201).json(topicResponse(data));
  } catch (error) {
    return handleError(res, error);
  }
});

app.delete("/topics/:name", authenticate, async (req, res) => {
  try {
    const name = req.params.name;
    const { data: topic, error: lookupError } = await supabase
      .from("topics").select("name, creator").eq("name", name).maybeSingle();
    if (lookupError) throw lookupError;
    if (!topic) return res.status(404).json({ message: "Topic not found." });
    if (!isAdmin(req.user) && topic.creator !== req.user.username) {
      return res.status(403).json({ message: "Forbidden: cannot delete this topic." });
    }
    const { error } = await supabase.from("topics").delete().eq("name", name);
    if (error) throw error;
    return res.json({ message: "Topic deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

app.get("/slides", authenticate, async (req, res) => {
  try {
    let query = supabase
      .from("slides")
      .select("id, topic, title, description, media, type, creator, created_at")
      .order("created_at", { ascending: true });
    if (req.query.topic) query = query.eq("topic", req.query.topic);
    const { data, error } = await query;
    if (error) throw error;
    return res.json((data || []).map(slideResponse));
  } catch (error) {
    return handleError(res, error);
  }
});

app.post("/slides", authenticate, async (req, res) => {
  try {
    const topic = String(req.body.topic || "").trim();
    const title = String(req.body.title || "").trim();
    if (!topic || !title) {
      return res.status(400).json({ message: "Topic and title are required." });
    }

    const { data: topicData, error: topicError } = await supabase
      .from("topics").select("name").eq("name", topic).maybeSingle();
    if (topicError) throw topicError;
    if (!topicData) return res.status(404).json({ message: "Topic does not exist." });

    const { data, error } = await supabase
      .from("slides")
      .insert({
        topic,
        title,
        description: String(req.body.description ?? req.body.desc ?? ""),
        media: String(req.body.media || ""),
        type: String(req.body.type || "text"),
        creator: req.user.username,
      })
      .select("id, topic, title, description, media, type, creator, created_at")
      .single();
    if (error) throw error;
    return res.status(201).json(slideResponse(data));
  } catch (error) {
    return handleError(res, error);
  }
});

app.delete("/slides/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid slide id." });
    const { data: slide, error: lookupError } = await supabase
      .from("slides").select("id, creator").eq("id", id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!slide) return res.status(404).json({ message: "Slide not found." });
    if (!isAdmin(req.user) && slide.creator !== req.user.username) {
      return res.status(403).json({ message: "Forbidden: cannot delete this slide." });
    }
    const { error } = await supabase.from("slides").delete().eq("id", id);
    if (error) throw error;
    return res.json({ message: "Slide deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

app.delete("/topics/:name/slides", authenticate, async (req, res) => {
  try {
    const name = req.params.name;
    const { data: topic, error: lookupError } = await supabase
      .from("topics").select("name, creator").eq("name", name).maybeSingle();
    if (lookupError) throw lookupError;
    if (!topic) return res.status(404).json({ message: "Topic not found." });
    if (!isAdmin(req.user) && topic.creator !== req.user.username) {
      return res.status(403).json({ message: "Forbidden: cannot delete slides for this topic." });
    }
    const { error } = await supabase.from("slides").delete().eq("topic", name);
    if (error) throw error;
    return res.json({ message: "Slides deleted for topic." });
  } catch (error) {
    return handleError(res, error);
  }
});

app.delete("/all", authenticate, async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: "Only admin can delete all content." });
    const { error: slidesError } = await supabase.from("slides").delete().not("id", "is", null);
    if (slidesError) throw slidesError;
    const { error: topicsError } = await supabase.from("topics").delete().not("name", "is", null);
    if (topicsError) throw topicsError;
    return res.json({ message: "All topics and slides deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Sunesis backend listening on port ${PORT}`));
}

module.exports = app;
