import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".ttf": "font/ttf", ".md": "text/plain; charset=utf-8" };
createServer(async (req, res) => {
  let pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/frame") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('<turbo-frame id="details"><h3>Loaded from a Turbo Frame</h3><p>Server-rendered content is ready.</p><input aria-label="Frame input"></turbo-frame>');
    return;
  }
  if (pathname === "/" || pathname === "/next") pathname = "/examples/gallery.html";
  if (pathname === "/regression" || pathname === "/regression/next") pathname = "/test/fixtures/index.html";
  if (pathname === "/docs" || pathname === "/docs/") pathname = "/docs/site/getting-started.html";
  else if (/^\/docs\/[a-z-]+$/.test(pathname)) pathname = `/docs/site/${pathname.split("/").at(-1)}.html`;
  const file = resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!file.startsWith(root + "/")) { res.writeHead(403); res.end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch { res.writeHead(404); res.end("Not found"); }
}).listen(Number(process.env.PORT || 4173), "127.0.0.1", () => console.log("Hotwire Sheets examples: http://127.0.0.1:4173"));
