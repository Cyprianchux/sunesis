import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const pages = [
  "index.html",
  "src/account.html",
  "src/board.html",
  "src/footer-pages.html",
  "src/reset-password.html",
  "src/slide-admin.html",
  "src/slide-view.html",
  "src/verify-email.html",
  "src/web-view.html",
];

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(process.cwd(), page)]),
      ),
    },
  },
  plugins: [
    {
      name: "copy-classic-scripts",
      async closeBundle() {
        await cp(
          resolve(process.cwd(), "src/js"),
          resolve(process.cwd(), "dist/src/js"),
          { recursive: true },
        );
      },
    },
  ],
});
