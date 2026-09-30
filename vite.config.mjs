import { cp, readFile } from "node:fs/promises";
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

function preserveStylesheetOrder() {
  return {
    name: "preserve-stylesheet-order",
    enforce: "post",
    async generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "asset" || !output.fileName.endsWith(".html")) continue;

        const sourcePath = resolve(process.cwd(), output.fileName);
        const sourceHtml = await readFile(sourcePath, "utf8");
        const sourceStyles = [
          ...sourceHtml.matchAll(/href=["'](?:\/)?src\/css\/([^"'?#]+)\.css(?:\?[^"']*)?["']/g),
        ].map((match) => match[1]);
        const html = String(output.source);
        const assetStyles = [];
        const htmlWithoutAssetStyles = html.replace(/<link\b[^>]*>/g, (tag) => {
          const href = tag.match(/\bhref=["']([^"']+\.css)["']/)?.[1];
          if (!href || !href.startsWith("/assets/")) return tag;
          assetStyles.push({ tag, href });
          return "";
        });

        if (assetStyles.length === 0) continue;

        assetStyles.sort((a, b) => {
          const getOrder = (href) => {
            const file = href.slice("/assets/".length);
            return sourceStyles.findIndex(
              (name) => file === `${name}.css` || file.startsWith(`${name}-`),
            );
          };
          const aOrder = getOrder(a.href);
          const bOrder = getOrder(b.href);
          return (aOrder < 0 ? Infinity : aOrder) - (bOrder < 0 ? Infinity : bOrder);
        });

        const insertionPoint = htmlWithoutAssetStyles.search(
          /<link\b(?=[^>]*\brel=["']stylesheet["'])/i,
        );
        const orderedStyles = assetStyles.map(({ tag }) => tag).join("\n    ");
        output.source =
          insertionPoint < 0
            ? htmlWithoutAssetStyles.replace("</head>", `    ${orderedStyles}\n  </head>`)
            : `${htmlWithoutAssetStyles.slice(0, insertionPoint)}${orderedStyles}\n    ${htmlWithoutAssetStyles.slice(insertionPoint)}`;
      }
    },
  };
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(process.cwd(), page)]),
      ),
    },
  },
  plugins: [
    preserveStylesheetOrder(),
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
