# Watercolor artwork

The active gallery uses 22 public-domain watercolors from the Art Institute of Chicago. Each of the 16 named examples has a different main artwork; additional paintings appear in avatars, product thumbnails, and nested sheets. `examples/watercolors.js` maps presentation slots to artwork IDs.

The museum marks every selected record as `is_public_domain: true`. Images are available under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The [museum API documentation](https://api.artic.edu/docs/#images) describes image access; `sources.json` preserves the artwork metadata, original page, and download URL. These are existing watercolor artworks, not generated images or filters applied to photographs.

Images are stored locally at 1200 pixels wide and cropped only by the presentation's CSS. To restore missing files, run `node scripts/fetch-watercolor-assets.mjs` with network access and Playwright installed.

| File | Artwork | Artist |
| --- | --- | --- |
| `16803.jpg` | [Two Boys Watching Schooners](https://www.artic.edu/artworks/16803) | Winslow Homer |
| `14794.jpg` | [Woodsheds, Tyrol](https://www.artic.edu/artworks/14794) | John Singer Sargent |
| `38666.jpg` | [The Water Fan](https://www.artic.edu/artworks/38666) | Winslow Homer |
| `15728.jpg` | [An Artist at His Easel](https://www.artic.edu/artworks/15728) | John Singer Sargent |
| `99749.jpg` | [Grove of Trees](https://www.artic.edu/artworks/99749) | Pierre Auguste Renoir |
| `111164.jpg` | [Green and Blue: The Dancer](https://www.artic.edu/artworks/111164) | James McNeill Whistler |
| `14792.jpg` | [Olive Trees, Corfu](https://www.artic.edu/artworks/14792) | John Singer Sargent |
| `16831.jpg` | [Stowing Sail](https://www.artic.edu/artworks/16831) | Winslow Homer |
| `227483.jpg` | [Girl in Spanish Costume](https://www.artic.edu/artworks/227483) | John Singer Sargent |
| `133456.jpg` | [Tarragona Terrace and Garden](https://www.artic.edu/artworks/133456) | John Singer Sargent |
| `113100.jpg` | [North Woods Club, Adirondacks (The Interrupted Tete-a-Tete)](https://www.artic.edu/artworks/113100) | Winslow Homer |
| `16823.jpg` | [The Rapids, Hudson River, Adirondacks](https://www.artic.edu/artworks/16823) | Winslow Homer |
| `14313.jpg` | [Chelsea Shop](https://www.artic.edu/artworks/14313) | James McNeill Whistler |
| `16785.jpg` | [The End of the Day, Adirondacks](https://www.artic.edu/artworks/16785) | Winslow Homer |
| `16779.jpg` | [Breaking Storm, Coast of Maine](https://www.artic.edu/artworks/16779) | Winslow Homer |
| `210482.jpg` | [I'timad-ud-Daula's Tomb at Agra](https://www.artic.edu/artworks/210482) | India |
| `16733.jpg` | [Road in Provence](https://www.artic.edu/artworks/16733) | Paul Cézanne |
| `14837.jpg` | [Netting the Fish](https://www.artic.edu/artworks/14837) | Winslow Homer |
| `101509.jpg` | [Man Wearing a Straw Hat](https://www.artic.edu/artworks/101509) | Paul Cézanne |
| `18667.jpg` | [Portrait of Berthe Morisot with a Fan](https://www.artic.edu/artworks/18667) | Édouard Manet |
| `189152.jpg` | [Life-Size Black Bass](https://www.artic.edu/artworks/189152) | Winslow Homer |
| `20529.jpg` | [Montagne Sainte-Victoire (The Arc Valley)](https://www.artic.edu/artworks/20529) | Paul Cézanne |
