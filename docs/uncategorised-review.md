# Uncategorised products — needs owner confirmation

The master CSV has no category flag for these 11. `build-products.mjs` assigned a
PROVISIONAL category (marked `provisionalCategory: true` in products.json) so the
build stays valid. Confirm or override each, then update `PROVISIONAL_CATEGORY` in
the build script.

| img | product | provisional category | note |
|----:|---------|----------------------|------|
| 3 | FLOWING HEART INCENSE DISH | `organisers` | |
| 15 | Minimal Tray Set | `organisers` | |
| 17 | BAMBU LAB COLOUR SWATCHES | `organisers` | |
| 20 | "NOT CIGARETTE" Cigarette Box | `organisers` | |
| 23 | Minimal Lantern Bubble Tea | `lamps` | |
| 32 | Minimal Mesh Gaming Console Stand | `display` | |
| 41 | Egg Capsule for Tiny Toys | `display` | |
| 52 | Gacha / box toys modular display shelf | `display` | |
| 84 | Christmas Accessories Vol.1 – 3D Printed Christmas Ball Ornament | `organisers` | |
| 85 | Ninja Memo Board Pin Set – Kunai & Shuriken | `organisers` | |
| 97 | Aura \| Architectural Ribbed Square Planter with Hidden Drainage | `organisers` | |

## Also confirm

- `organisers` category is now 26 items (was 53). Rule: a product keeps
  `organisers` only when no more specific category (skadis/lamps/apple/display) applies.
- `planter` is a **tag** (3 items), not a category. Aura (97) is planter-only so it
  currently has a provisional `organisers` category.
- `k-pop` demoted from category to tag (1 item).

