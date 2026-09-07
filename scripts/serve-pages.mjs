import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pagesBasePath } from "./pages-config.mjs";

const root = fileURLToPath(new URL("../dist/", import.meta.url)).replace(/\/$/, "");
const port = Number(process.env.PORT || 4174);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (pagesBasePath !== "/" && url.pathname === pagesBasePath.slice(0, -1)) {
      response.writeHead(301, { Location: pagesBasePath + url.search }).end(); return;
    }
    if (!url.pathname.startsWith(pagesBasePath)) throw new Error("Outside site");
    let file = resolve(root, decodeURIComponent(url.pathname.slice(pagesBasePath.length)));
    if (file !== root && !file.startsWith(root + "/")) throw new Error("Outside site");
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(301, { Location: url.pathname + "/" + url.search }).end(); return;
      }
      file = resolve(file, "index.html");
    }
    response.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Static Pages preview: http://127.0.0.1:${port}${pagesBasePath}`));
