const http = require("http");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { createApp } = require("../../api/server");
const { createMockSupabaseClient } = require("../fixtures/mock-supabase");

const PORT = Number(process.env.E2E_PORT || 3000);
const ROOT = path.resolve(__dirname, "..", "..");

const server = express();

server.use(express.json({ limit: "15mb" }));

const api = createApp(createMockSupabaseClient());

const VERCEL_REWRITES = [
  { source: "/src/account", dest: "/src/account.html" },
  { source: "/src/board", dest: "/src/board.html" },
  { source: "/src/slide-admin", dest: "/src/slide-admin.html" },
  { source: "/src/slide-view", dest: "/src/slide-view.html" },
  { source: "/src/web-view", dest: "/src/web-view.html" },
  { source: "/src/footer-pages", dest: "/src/footer-pages.html" },
  { source: "/src/verify-email", dest: "/src/verify-email.html" },
  { source: "/src/reset-password", dest: "/src/reset-password.html" },
];

server.use((req, res, next) => {
  const v = VERCEL_REWRITES.find((r) => req.path === r.source);
  if (v) {
    req.url = v.dest;
  }
  next();
});

server.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const ext = path.extname(req.path);
  if (ext) return next();

  if (req.path === "/") return next();

  const candidates = [req.path + ".html", req.path + "/index.html"];
  for (const rel of candidates) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      req.url = rel;
      return next();
    }
  }

  next();
});

server.use(express.static(ROOT));

server.use((req, res, next) => {
  if (req.path.startsWith("/auth") || req.path.startsWith("/topics") || req.path.startsWith("/slides") || req.path === "/all" || req.path === "/health") {
    return api(req, res, next);
  }
  next();
});

server.get("*", (req, res) => {
  res.status(404).send("Not found");
});

const httpServer = http.createServer(server);

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`E2E test server listening on http://localhost:${PORT}`);
  });
}

module.exports = httpServer;
