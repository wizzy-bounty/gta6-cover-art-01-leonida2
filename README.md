# Leonida Grid — Your Photos, Posted from Leonida

[![gta6-cover-art-01 on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-leonida2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-leonida2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An entry for the make.fun **gta6-cover-art-01** bounty ("Make GTA 6 Cover Art").

**Leonida Grid** turns your own photos into GTA-style cover art — and mails
it home as a postcard. Drop in up to six photos and they land in a
multi-panel comic grid on the picture side of a Leonida postcard:
perforated left edge, a postage stamp that follows the grade you pick, a
circular **LEONIDA — MAY 26 2026** postmark with wavy cancellation lines
across the stamp corner, and a big condensed cover title along the bottom.

## The app

A static web app under `app/` — no build step, no network requests, and
photos are read on your own machine and never uploaded (the app says so in
the UI, and it is true: everything is drawn on a local canvas).

- **Photo grid** — file picker or drag-and-drop for 1–6 photos, drawn into
  the panels with cover-crop. Click a panel to select it, drag inside it to
  reposition the photo, scroll or use the sliders to zoom.
- **6 layouts** — Hero Left (the hero spans a 2×2 block), Hero Top, Twin
  Strip, Quad, Six-Up, and Classic Cover (full-bleed hero under the title
  band), all with thin cream gutters and ink borders between panels.
- **Drawn demo scenes** — on first load, six Leonida scenes painted in
  code on a canvas (Sunset Bay, Palm Strip, Neon Harbor, Causeway at Dusk,
  Marina Morning, Airfield Dusk — no external assets) fill the grid, so
  the cover is complete before you add anything and Six-Up shows six
  distinct scenes. Uploaded photos replace demo panels one by one; a Reset
  button restores the scenes.
- **Pop-out hero** — a toggle that scales the hero panel's picture past
  its frame edge with a drop shadow and a paper edge, the classic
  frame-break cover move (it spills over gutters and neighbours, never
  over the perforation).
- **5 postcard grades** — Bronze, Silver, Gold, Platinum and Leonida
  Legend. Each grade tints the card's paper and frame, restyles the stamp
  (ink, denomination, painted sun-over-the-bay art), grades the photos
  with its own gradient-map ramp, and prints a one-line flavour caption
  on the card.
- **3 title treatments** — Classic (ink band, poster title, script
  subtitle), Neon (glowing dual-tone lettering) and Newsprint (ink on
  paper, double rules, letterspaced subtitle). The cover title and
  subtitle are editable, with title presets included.
- **Postcard identity** — perforated left edge with punched holes and a
  tear line, corner grade stamp, the fixed-date postmark and its wavy
  cancellation lines.
- **Polish** — live canvas preview, undo/redo (Ctrl+Z / Ctrl+Shift+Z),
  film grain and vignette toggles, and one-click PNG export at
  **1920 x 1080**, **1080 x 1350** and **1080 x 1080** — the export renders
  the grid, frame, stamp, postmark and caption exactly as previewed.

## Run it

```sh
node serve.ts            # serves app/ at http://127.0.0.1:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with `buildDossier` from
`vendor/makefun-app.ts`, the kit's library, unchanged.

## Screenshots

- `screenshots/01-grid.jpg` — the studio at 1280 x 800 in its default
  state: Hero Left grid filled with the drawn demo scenes, pop-out hero
  on, Leonida Legend grade, stamp and postmark in the corner, and the
  full controls panel (photos, layouts, grades, treatments, export).
- `screenshots/02-sixup.jpg` — the Six-Up layout: all six demo scenes,
  one distinct scene per panel.
- `screenshots/03-classic.jpg` — Classic Cover with the Newsprint title
  treatment and the Gold grade.
- `screenshots/04-quad.jpg` — the Quad layout with the Neon title
  treatment and the Platinum grade.

Leonida Grid is an original fan-made tool; it uses no Rockstar Games logo,
artwork or fonts. Lettering: Anton & Pacifico (SIL Open Font License, see
`app/fonts/OFL.txt`).

## Challenger notes

This build evolves the earlier Leonida Postcard entry in place: the
postcard identity (perforation, stamp, postmark, grades) is kept, but the
picture side is now the photo-upload multi-panel grid that the top of the
leaderboard rewards — six grid layouts, a pop-out hero, and six drawn
demo scenes standing in until the visitor's own photos replace them. The
determinism contract is unchanged: `main.ts` produces a byte-identical
dossier across runs.

## License

MIT — see `LICENSE`.
