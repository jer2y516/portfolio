# Tag taxonomy

Tags are **additive and cross-cutting** — a lamp and a SKÅDIS box can share one.
They exist for SEO / long-tail search, not primary navigation (that's the 5
categories: `skadis` `lamps` `apple` `organisers` `display`).

Rules for adding a tag to the vocabulary:
1. It's a phrase people actually search ("no supports", "magsafe", "print in place").
2. It is **not** just a rename of a category.
3. At least ~3 products qualify, OR it's a precise niche term worth the page
   (`bambu-lab-led-kit`).

## Vocabulary (14)

| Tag | Meaning | Source |
|-----|---------|--------|
| `magsafe` | snaps to / aligns with Apple MagSafe | name + Cults |
| `apple-watch` | holds or charges an Apple Watch | name + Cults |
| `headphones` | headphone / earphone stand or holder | name + Cults |
| `bambu-lab-led-kit` | uses the Bambu Lab LED Kit 001 | Cults / Thangs title |
| `no-supports` | prints with no support material | **Cults only** |
| `print-in-place` | assembles as it prints, no assembly | **Cults only** |
| `multi-color` | designed for AMS / multi-material | name + Cults |
| `modular` | expands / reconfigures / stacks | name + Cults |
| `charging` | a charging dock / stand / station | name + Cults |
| `cable-management` | routes or hides cables | name + Cults |
| `retro` | retro / vintage / 80s styling | name + Cults |
| `planter` | holds a plant (demoted from category) | CSV + name |
| `k-pop` | K-pop merch / idol theme (demoted from category) | CSV + name |
| `seasonal` | Christmas / holiday item | name + Cults |

## How tags are assigned

`scripts/build-products.mjs`:
- **CSV flags** → `k-pop`, `planter`
- **Product name** → conservative regexes (`NAME_TAG_RULES`) for the terms that
  appear in titles
- **Cults `tagNames`** → `CULTS_TAG_MAP`, only when `raw-assets/cults_export.json`
  exists (run `scripts/fetch-cults.mjs`). This is where `no-supports`,
  `print-in-place` and most `bambu-lab-led-kit` come from — they're never in the
  title.

Name-only pass currently tags ~36 / 101. The Cults pass fills the rest.
