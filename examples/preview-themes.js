// Shared by the gallery card chrome and the browser-rendered device previews.
const palettes = {
  mint: { light: "#e3faf0", wash: "#c2ebdb", deep: "#90cebb", screen: "#edfff7", edge: "#8bbcab", shadow: "#285f4930", caption: "#f1faf5", border: "#cfe5d9" },
  sky: { light: "#e5f5fd", wash: "#c8e4ef", deep: "#9dc7da", screen: "#f0fbff", edge: "#91b7c8", shadow: "#315b7230", caption: "#f1f8fc", border: "#d2e3eb" },
  clay: { light: "#fff1e8", wash: "#eed7ca", deep: "#d7af9c", screen: "#fff6ef", edge: "#c7a391", shadow: "#80584030", caption: "#fdf6f1", border: "#eadbd1" }
};
const family = {
  bottom: "mint", top: "clay", detached: "sky", card: "mint",
  sidebar: "clay", toast: "sky", stacking: "mint", persistent: "sky",
  detents: "mint", depth: "sky", keyboard: "mint", lightbox: "clay",
  parallax: "clay", long: "mint", page: "sky", "page-bottom": "clay"
};
export const previewTheme = kind => palettes[family[kind] || "mint"];
