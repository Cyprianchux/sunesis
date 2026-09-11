require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { generateToken, sendVerificationEmail, sendResetEmail } = require("./email");

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

function createApp(supabase) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "15mb" }));

  app.use((req, _res, next) => {
    if (req.url === "/api" || req.url.startsWith("/api/")) {
      req.url = req.url.slice(4) || "/";
    }
    next();
  });

  const ADMIN_ROLE = "admin";
  const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

  function hashPassword(password) {
    return crypto.createHash("sha256").update(password, "utf8").digest("hex");
  }

  function normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      .select("username, role, email, email_verified, password_hash")
      .eq("username", normalizeUsername(username))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getUserByEmail(email) {
    const { data, error } = await supabase
      .from("users")
      .select("username, role, email, email_verified, password_hash")
      .eq("email", normalizeEmail(email))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createTokenRecord(username, type, ttlMs) {
    const token = generateToken();
    const { error } = await supabase.from("tokens").insert({
      token,
      username,
      type,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
    });
    if (error) throw error;
    return token;
  }

  async function consumeToken(token, type) {
    const { data, error } = await supabase
      .from("tokens")
      .select("token, username, type, expires_at")
      .eq("token", token)
      .eq("type", type)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (new Date(data.expires_at).getTime() <= Date.now()) {
      await supabase.from("tokens").delete().eq("token", token);
      return null;
    }
    await supabase.from("tokens").delete().eq("token", token);
    return data;
  }

  function safeUser(user) {
    return {
      username: user.username,
      role: user.role,
      email: user.email,
      email_verified: Boolean(user.email_verified),
    };
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
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || "");
      const role = "user";

      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, email, and password are required." });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }

      if (await getUser(username)) {
        return res.status(409).json({ message: "User already exists." });
      }
      if (await getUserByEmail(email)) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      const { data, error } = await supabase
        .from("users")
        .insert({ username, email, email_verified: false, password_hash: hashPassword(password), role })
        .select("username, role, email, email_verified")
        .single();
      if (error) {
        if (error.code === "23505") {
          return res.status(409).json({ message: "User already exists." });
        }
        throw error;
      }

      const token = await createTokenRecord(username, "verify", VERIFY_TOKEN_TTL_MS);
      await sendVerificationEmail({ email, username, token });

      return res.status(201).json({ user: safeUser(data) });
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

      const email = `${username}@sunesis.local`;
      const { error } = await supabase
        .from("users")
        .insert({ username, email, email_verified: true, password_hash: passwordHash.toLowerCase(), role });
      if (error) {
        if (error.code === "23505") return res.status(200).json({ message: "User already exists." });
        throw error;
      }
      return res.status(201).json({ user: { username, role, email_verified: true } });
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

      const safeUserOut = safeUser(user);
      return res.json({ user: safeUserOut, token: createToken(safeUserOut) });
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.get("/auth/me", authenticate, (req, res) => res.json({ user: req.user }));

  app.get("/auth/verify-email", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).json({ message: "Verification token is required." });

      const record = await consumeToken(token, "verify");
      if (!record) {
        return res.status(400).json({ message: "Invalid or expired verification link." });
      }

      const { error } = await supabase
        .from("users")
        .update({ email_verified: true })
        .eq("username", record.username);
      if (error) throw error;

      return res.json({ message: "Email verified successfully. You can now sign in." });
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/auth/resend-verification", async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      if (!email || !EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      const user = await getUserByEmail(email);
      if (!user || user.email_verified) {
        return res.status(404).json({ message: "No unverified account found for that email." });
      }
      const token = await createTokenRecord(user.username, "verify", VERIFY_TOKEN_TTL_MS);
      await sendVerificationEmail({ email: user.email, username: user.username, token });
      return res.json({ message: "Verification email sent." });
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/auth/forgot-password", async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      const user = await getUserByEmail(email);
      if (user) {
        const token = await createTokenRecord(user.username, "reset", RESET_TOKEN_TTL_MS);
        await sendResetEmail({ email: user.email, username: user.username, token });
      }
      return res.json({ message: "If an account exists for that email, a password reset link has been sent." });
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/auth/reset-password", async (req, res) => {
    try {
      const token = String(req.body.token || "");
      const password = String(req.body.newPassword || "");

      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required." });
      }
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters, include a number and an uppercase letter." });
      }

      const record = await consumeToken(token, "reset");
      if (!record) {
        return res.status(400).json({ message: "Invalid or expired reset link." });
      }

      const { error } = await supabase
        .from("users")
        .update({ password_hash: hashPassword(password) })
        .eq("username", record.username);
      if (error) throw error;

      return res.json({ message: "Password reset successfully. You can now sign in." });
    } catch (error) {
      return handleError(res, error);
    }
  });

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

  return app;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const app = createApp(supabase);

if (require.main === module) {
  app.listen(PORT, () => console.log(`Sunesis backend listening on port ${PORT}`));
}

module.exports = app;
module.exports.createApp = createApp;
