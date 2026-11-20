# Leonida Postcard — Vice City Cover Studio

[![gta6-cover-art-01 on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-leonida2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-leonida2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An entry for the make.fun **gta6-cover-art-01** bounty ("Make GTA 6 Cover Art").

Everybody else built a neon cover *studio*. This one is a **postcard from
Leonida**: your holiday photos, panelled like a Vice City souvenir card —
white postcard frame, a Leonida postage stamp, a circular VICE CITY postmark
with today's date, a star heat meter, film grain, and a "Greetings from
Leonida" ribbon under a bold poster title.

## The app

A static web app under `app/` — no build step, no network requests, photos
are read on your own machine and never uploaded.

- **6 layouts** — Hero + 3, Full bleed, Nine panel, Tilted snaps (polaroid
  cards over a sunset gradient), Split day/night (the right panel is always
  neon-graded), and the signature Postcard frame.
- **5 colour grades** — Vice Sunset, Neon Night, Palm Gold, Ocean Teal and
  Mono Noir, each a per-photo gradient-map LUT computed on a canvas.
- **Any photo, every panel** — upload or drag-and-drop your own photos, put
  one photo in several panels or a different one in each, then drag inside a
  panel to reposition, scroll or use the sliders to zoom. Panels start
  focus-framed so faces land in frame.
- **Lettering** — editable cover title (Anton) and neon script subtitle
  (Pacifico), both SIL Open Font License fonts shipped under `app/fonts/`
  with their license texts in `app/fonts/OFL.txt`. Title presets included:
  Neon Shore, Night Shift, Pier Pressure, Palm Hour, Vice Mail.
- **Postcard dressing** — editable stamp headline and postmark place, a
  0–5 star heat meter, and toggles for film grain, vignette, the halftone
  title block and the greetings ribbon.
- **Polish** — live canvas preview, undo/redo (Ctrl+Z / Ctrl+Shift+Z), and
  one-click PNG export at **1920 x 1080**, **1080 x 1350** and
  **1080 x 1080**.

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

- `screenshots/01-cover.jpg` — an exported 1920 x 1080 cover (Hero + 3, Vice Sunset)
- `screenshots/02-editor.jpg` — the studio in a browser with the sample photos loaded
- `screenshots/03-portrait.jpg` — an exported 1080 x 1350 cover (Tilted snaps, Neon Night)
- `screenshots/04-square.jpg` — an exported 1080 x 1080 cover (Postcard frame, Palm Gold)

The sample photos under `app/samples/` were made with an image model for
make.fun and are free to use. Leonida Postcard is an original fan-made tool;
it uses no Rockstar Games logo, artwork or fonts.

## Challenger notes

This build is a clean-room rebuild of the Leonida Postcard concept for the
resubmission: the whole studio — shell, editor logic and cover renderer —
was written fresh in one recorded session against the design spec, with the
transcript defects of the earlier attempt designed out (every file's final
content comes from the recorded build itself). Two rendering defects found
in self-review were fixed before hand-in: the title auto-fit now measures
with the real display font, so long titles can no longer run under the heat
stars, and the postcard ribbon is painted beneath the title row so the
lettering and heat meter stay readable on the paper frame.

## License

MIT — see `LICENSE`.

## Challenger notes

This challenger is a clean-room rebuild of the Leonida Postcard cover maker, written from scratch against the design spec rather than patched from the earlier entry. It keeps the postcard idea intact — six layouts, five colour grades, per-panel focal crop and zoom, an editable stamp and postmark, and a star heat meter — but every file in the studio was authored fresh for this resubmission. Covers export as PNG in the three post sizes (1920 x 1080, 1080 x 1350, and 1080 x 1080), ready to share.
