# About-page skill icons

Drop the tool logos referenced in `src/pages/about.astro` here, as SVG
(square-ish, transparent or white ground). Filenames must match the
`skillIcons` list in that file:

    figma.svg  adobe-cc.svg  claude.svg  openai.svg
    blender.svg  bambu.svg  atlassian.svg  instagram.svg

Until a file exists, the marquee shows a text placeholder with the tool
name. Get official SVGs from each vendor's brand / press page.
Served at `/about-icons/<file>`; committed as-is (no optimisation step).
