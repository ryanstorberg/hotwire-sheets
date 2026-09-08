import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pagesBasePath } from "./pages-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");
const origin = "https://pages.invalid";
const documentNames = (await readdir(resolve(root, "docs/site")))
  .filter(name => name.endsWith(".html")).map(name => name.slice(0, -5));

// Resolve links against the development route before making directory indexes.
// This keeps downloads such as api-inventory.json beside the guides.
function siteURL(value, route = "/") {
  if (!value || value.startsWith("#")) return value;
  const url = new URL(value.replaceAll("&amp;", "&"), origin + route);
  if (url.origin !== origin) return value;
  let path = url.pathname;
  if (path === "/docs" || documentNames.some(name => path === `/docs/${name}`)) path += "/";
  return `${pagesBasePath}${path.slice(1)}${url.search}${url.hash}`.replaceAll("&", "&amp;");
}
function html(source, route) {
  return source.replace(/\b(href|src)=(['"])(.*?)\2/g, (_, attribute, quote, value) =>
    `${attribute}=${quote}${siteURL(value, route)}${quote}`);
}
async function write(path, contents) {
  const target = resolve(output, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const { metafile } = await build({
  absWorkingDir: root,
  entryPoints: ["examples/gallery.js"], outdir: resolve(output, "assets"),
  entryNames: "[name]-[hash]", metafile: true,
  bundle: true, format: "esm", target: "es2022", minify: true,
  plugins: [{ name: "gallery-core", setup(bundler) {
    bundler.onResolve({ filter: /^(hotwire-sheets(?:\/stimulus)?|\/src\/(?:stimulus\/)?index\.js)$/ }, ({ path }) => ({
      path: resolve(root, path.includes("stimulus") ? "src/stimulus/index.js" : "src/index.js")
    }));
  } }]
});
const galleryOutput = Object.entries(metafile.outputs).find(([, details]) => details.entryPoint === "examples/gallery.js")?.[0];
if (!galleryOutput) throw new Error("Missing gallery entry point in Pages bundle.");
const galleryScript = `/${relative(output, resolve(root, galleryOutput))}`;
const gallery = (await readFile(resolve(root, "examples/gallery.html"), "utf8"))
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, "")
  .replace('src="/examples/gallery.js"', `src="${galleryScript}"`);
await write("index.html", html(gallery, "/"));
for (const name of documentNames) {
  const source = await readFile(resolve(root, `docs/site/${name}.html`), "utf8");
  const rendered = html(source, `/docs/${name}`);
  await write(`docs/${name}/index.html`, rendered);
  if (name === "getting-started") await write("docs/index.html", rendered);
}
for (const path of [
  "app/assets/stylesheets/hotwire_sheets.css", "examples/gallery.css", "examples/site.css",
  "docs/docs.css", "docs/theme.css", "docs/docs.js"
]) {
  const source = await readFile(resolve(root, path), "utf8");
  await write(path, path.endsWith(".css") ? source.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g,
    (_, quote, url) => `url(${quote}${siteURL(url)}${quote})`) : source);
}
for (const name of await readdir(resolve(root, "docs"))) {
  if (!/\.(md|txt|json)$/.test(name)) continue;
  const source = await readFile(resolve(root, "docs", name), "utf8");
  await write(`docs/${name}`, name.endsWith(".md") ? source.replace(/\]\((\/[^)]*)\)/g,
    (_, url) => `](${siteURL(url)})`) : source);
}
for (const path of ["examples/assets/previews", "examples/assets/watercolors"]) {
  await cp(resolve(root, path), resolve(output, path), { recursive: true });
}
await write(".nojekyll", "");
await write("404.html", `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · Hotwire Sheets</title><link rel="stylesheet" href="${pagesBasePath}docs/docs.css"><main id="content"><h1>Page not found</h1><p><a href="${pagesBasePath}">Explore the examples</a> or <a href="${pagesBasePath}docs/">read the documentation</a>.</p></main></html>`);
console.log(`Built GitHub Pages site in dist/ for ${pagesBasePath}`);
