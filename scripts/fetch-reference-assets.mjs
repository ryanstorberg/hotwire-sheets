import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Public images observed in Silk's live gallery on 2026-09-06.
// These demonstration assets are separate from the MIT-licensed runtime.
const media = {
  "bottom-preview": ["BottomSheet.3049979c.png", 1200], "top-preview": ["TopSheet.e33d3478.png", 1200],
  "detached-preview": ["DetachedSheet.08a734e0.png", 1200], "card-preview": ["Card.6d9fc365.png", 1200],
  "sidebar-preview": ["Sidebar.e4eb7fcb.png", 1200], "toast-preview": ["Toast.38ad7f1f.png", 1200],
  "stacking-preview": ["SheetWithStacking.7dcfe5ef.png", 1200], "persistent-preview": ["PersistentSheet.201a722b.png", 1200],
  "detents-preview": ["SheetWithDetent.e5952cf7.png", 1200], "depth-preview": ["SheetWithDepth.d8dd2cef.png", 1200],
  "keyboard-preview": ["SheetWithKeyboard.d393aec3.png", 1200], "lightbox-preview": ["Lightbox.142663ef.png", 1200],
  "parallax-preview": ["ParallaxPage.34ba5ada.png", 1200], "long-preview": ["LongSheet.96e4a913.png", 1200],
  "page-preview": ["Page.f6a85529.png", 1200], "page-bottom-preview": ["PageFromBottom.860b7024.png", 1200],
  tennis: ["image5.fc45ba86.jpg", 384], house: ["image3.b411e420.jpg", 640], meal: ["image4.035c17d3.jpg", 256],
  paint: ["image10.f86822f0.jpg", 640], acme: ["image12.479d3f5e.jpg", 64], luca: ["image6.cabbea59.jpg", 48],
  architecture: ["image13.c7d9a95f.jpg", 1920], mountains: ["image11.9cadf26e.jpg", 1920],
  erik: ["erikjohansson-large.578bfe9c.jpg", 256], sophie: ["sophiedubois-large.89ee0392.jpg", 256],
  barcelona: ["image9.13f6ec46.jpg", 384], santorini: ["image.58a9f403.jpg", 1920],
  seville: ["image14.f8e41612.jpg", 1920], field: ["image7.2a8b8f6b.jpg", 1920],
  sport: ["image8.161c558b.jpg", 1920], building: ["image16.662cb777.jpg", 1920],
  shoe0: ["4.6bc8879e.jpg", 256], shoe1: ["2.dabb4a32.jpg", 256], shoe2: ["1.7e569cac.jpg", 256], shoe3: ["3.194a4d72.jpg", 256],
  emma: ["emmaschmidt.68b82593.jpg", 128], liam: ["liammuller.7da0e011.jpg", 128], olivia: ["oliviadupont.0df5adad.jpg", 128],
  noah: ["noahgarcia.0da86514.jpg", 128], ava: ["avarossi.2d5f1a62.jpg", 128], sophia: ["sophiaivanova.c92784d9.jpg", 128],
  mason: ["masonpetrov.063c2d5b.jpg", 128], isabella: ["isabellasilva.d4f4d48b.jpg", 128], james: ["jamesnielsen.5f5f4730.jpg", 128],
  amelia: ["amelialeclair.c97b3982.jpg", 128], elijah: ["elijahkowalski.22cf0a05.jpg", 128], charlotte: ["charlottebernard.2ddcbe5d.jpg", 128],
  benjamin: ["benjaminsvensson.33514c04.jpg", 128], mia: ["miafernandez.4396b977.jpg", 128], henry: ["henrynovak.1baadc4c.jpg", 128]
};
const directory = resolve(import.meta.dirname, "../examples/assets");
await mkdir(directory, { recursive: true });
const manifest = Object.entries(media).map(([name, [file, width]]) => ({
  file: `${name}.jpg`, source: `https://silkhq.com/_next/image?url=${encodeURIComponent(`/_next/static/media/${file}`)}&w=${width}&q=75`
}));
manifest.push({ file: "inter.ttf", source: "https://silkhq.com/fonts/inter/Inter-VariableFont_opsz,wght.ttf" });
let index = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (index < manifest.length) {
    const asset = manifest[index++];
    const response = await fetch(asset.source);
    if (!response.ok) throw new Error(`${asset.file}: HTTP ${response.status}`);
    await writeFile(resolve(directory, asset.file), Buffer.from(await response.arrayBuffer()));
  }
}));
await writeFile(resolve(directory, "sources.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Saved ${manifest.length} reference assets.`);
