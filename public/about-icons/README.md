# About-page skill icons

Tool logos for the floating marquee on `/about`. Filenames must match the
`skillIcons` list in `src/pages/about.astro`, which is currently:

    01-figma.png      02-adobe-cc.png   03-claude.png   04-openai.png
    05-fusion360.png  06-atlassian.png  07-instagram.png  08-autodesk.png

Square (128×128), full-bleed artwork, transparent or white ground. A
non-square logo on a square canvas renders as a bar, because the tile uses
`object-fit: contain` — pad the artwork out to square before dropping it in.

Until a file exists the marquee shows a text placeholder with the tool name.
Get official artwork from each vendor's brand / press page. Served at
`/about-icons/<file>`; committed as-is (no optimisation step).

`09-buymeacoffee.png` is **not** in the marquee — the strip is tools used to
make the work, not places to support it. Kept here because the store bar still
shares `store_icon4.png` between Cubee and Buy Me a Coffee and needs its own.
