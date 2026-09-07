import { mkdir, readFile, writeFile } from "node:fs/promises";
import { marked } from "marked";

const pages = [
  ["Start here", "getting-started", "Getting started"], ["Start here", "examples", "Examples"], ["Start here", "recipes", "Recipes"],
  ["Reference", "rails", "Rails helpers"], ["Reference", "options", "Options"], ["Reference", "javascript", "JavaScript API"],
  ["Reference", "scroll", "Scroll"], ["Reference", "animations", "Animation APIs"], ["Reference", "primitives", "Stacks, focus and overlays"], ["Reference", "api-index", "API index"],
  ["Guides", "styling", "Styling and composition"], ["Guides", "turbo", "Turbo and Stimulus"], ["Guides", "concepts", "Core concepts"],
  ["Project", "troubleshooting", "Troubleshooting"], ["Project", "architecture", "Architecture"], ["Project", "coverage", "Coverage and limits"]
];
const escape = text => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const slug = text => text.toLowerCase().replace(/<[^>]*>|[`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const renderer = new marked.Renderer();
renderer.heading = function(token) { const html = this.parser.parseInline(token.tokens); return `<h${token.depth} id="${slug(token.text)}">${html}</h${token.depth}>\n`; };
renderer.link = function(token) {
  const href = token.href.replace(/^([a-z-]+)\.md(?=#|$)/, (match, id) => pages.some(([, key]) => key === id) ? `/docs/${id}` : match);
  return `<a href="${escape(href)}">${this.parser.parseInline(token.tokens)}</a>`;
};
marked.use({ renderer });
await mkdir(new URL("../docs/site/", import.meta.url), { recursive: true });
for (const [,id,title] of pages) {
  const markdown = await readFile(new URL(`../docs/${id}.md`, import.meta.url), "utf8");
  const toc = [...markdown.matchAll(/^## (.+)$/gm)].map(([,heading]) => `<a href="#${slug(heading)}">${escape(heading)}</a>`).join("");
  let previousGroup = "";
  const navigation = pages.map(([group,key,label]) => {
    const heading = group !== previousGroup ? `<h2>${group}</h2>` : ""; previousGroup = group;
    return `${heading}<a href="/docs/${key}" ${key === id ? 'aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Hotwire Sheets</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/docs/docs.css"><script src="/docs/docs.js" defer></script></head><body><a class="skip" href="#content">Skip to content</a><header class="docs-header"><a class="brand" href="/docs">Hotwire Sheets <span>0.1.0</span></a><a href="/">All Examples ↗</a></header><div class="docs-layout"><aside class="docs-navigation"><details open><summary>Documentation</summary><label class="nav-search">Find a guide<input type="search" placeholder="Search guides…" aria-label="Search guides"></label><nav>${navigation}</nav></details></aside><main id="content"><div class="doc-meta">RAILS · HOTWIRE · STIMULUS</div>${marked.parse(markdown)}<footer class="doc-footer"><a href="/">Try the examples</a><a href="/docs/${id}.md">Markdown source</a><span>Hotwire Sheets · Independent implementation</span></footer></main><aside class="on-this-page"><strong>On this page</strong>${toc}</aside></div></body></html>`;
  await writeFile(new URL(`../docs/site/${id}.html`, import.meta.url), html);
}
await writeFile(new URL("../docs/llms.txt", import.meta.url), `# Hotwire Sheets 0.1.0\n\nRails and Stimulus documentation. Legacy detents are zero-based open positions; activeDetent includes closed at 0.\n\n- [Full documentation](docs-full.md)\n${pages.map(([,id,title])=>`- [${title}](${id}.md)`).join("\n")}\n`);
await writeFile(new URL("../docs/docs-full.md", import.meta.url), (await Promise.all(pages.map(async ([,id]) => `<!-- Source: /docs/${id}.md -->\n\n${await readFile(new URL(`../docs/${id}.md`, import.meta.url), "utf8")}`))).join("\n\n---\n\n"));
console.log(`Built ${pages.length} documentation pages.`);
