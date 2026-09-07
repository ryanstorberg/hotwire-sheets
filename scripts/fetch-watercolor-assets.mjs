import { mkdir, writeFile, stat } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Open-access watercolors from the Art Institute of Chicago, selected for the demos.
const ids = [16803,14794,38666,15728,99749,111164,14792,16831,227483,133456,113100,16823,14313,16785,16779,210482,16733,14837,101509,18667,189152,20529];
const query = new URLSearchParams({ ids: ids.join(","), fields: "id,title,image_id,artist_display,medium_display,is_public_domain,thumbnail,date_display", limit: "100" });
const response = await fetch(`https://api.artic.edu/api/v1/artworks?${query}`);
if (!response.ok) throw new Error(`Artwork metadata: HTTP ${response.status}`);
const { data, config } = await response.json();
if (data.length !== ids.length) throw new Error("Incomplete artwork metadata");
const directory = new URL("../examples/assets/watercolors/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext();
const pending = [...data], sources = [];
try {
  await Promise.all(Array.from({ length: 3 }, async () => {
    const page = await context.newPage();
    while (pending.length) {
      const artwork = pending.shift();
      if (!artwork.is_public_domain || !/watercolor/i.test(artwork.medium_display) || !artwork.image_id) throw new Error(`Not an open-access watercolor: ${artwork.id}`);
      const download = `${config.iiif_url}/${artwork.image_id}/full/1200,/0/default.jpg`;
      const file = `${artwork.id}.jpg`;
      if (!(await stat(new URL(file, directory)).catch(() => null))?.size) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const image = await page.goto(download, { waitUntil: "commit", timeout: 20000 });
            if (!image.ok() || !image.headers()["content-type"]?.includes("image/jpeg")) throw new Error(`Image ${artwork.id}: HTTP ${image.status()}`);
            await writeFile(new URL(file, directory), await image.body());
            break;
          } catch (error) { if (attempt === 2) throw error; }
        }
      }
      sources.push({ ...artwork, file, source: `https://www.artic.edu/artworks/${artwork.id}`, download,
        license: "CC0 1.0", license_url: "https://creativecommons.org/publicdomain/zero/1.0/" });
    }
    await page.close();
  }));
} finally { await browser.close(); }
sources.sort((a,b) => ids.indexOf(a.id)-ids.indexOf(b.id));
await writeFile(new URL("sources.json", directory), JSON.stringify(sources, null, 2) + "\n");
console.log(`Downloaded ${sources.length} public-domain watercolors with source metadata.`);
