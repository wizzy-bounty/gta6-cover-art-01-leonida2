// Leonida Postcard — the hand-in program for the gta6-cover-art-01 bounty.
//
// The entry itself is the static web app under app/ (a Vice City cover
// studio that runs offline in a desktop browser). This program copies app/
// and screenshots/ into the output directory and writes dossier.json there
// with buildDossier from the vendored make.fun library, byte for byte the
// kit's own copy. Node 22, standard library only.
//
// Inside the grader the output directory is /output; anywhere else,
// MAKEFUN_OUTPUT_DIR names it instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear the output directory's contents only — never the directory itself:
// the grader hands us /output as a mounted directory, and removing the
// mount point breaks the run.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's own caps (from the kit's reference limits): the dossier text
// cap shapes the bytes; the rest refuse anything the scorer would refuse —
// more than 4 screenshots or one over 256 KiB, an app/ over 993 entries or
// 48 MiB, or a path under app/ longer than 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
