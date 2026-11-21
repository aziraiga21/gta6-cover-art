import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier as packageDossier } from "./vendor/makefun-app.ts";

const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
mkdirSync(destination, { recursive: true });

for (const folder of ["app", "screenshots"]) {
  const source = fileURLToPath(new URL(folder + "/", import.meta.url));
  cpSync(source, resolve(destination, folder), { recursive: true });
}

const dossier = packageDossier(destination, {
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
  screenshots: { max_bytes: 256 * 1024, max: 4 },
  text_max_bytes: 160 * 1024,
});
writeFileSync(resolve(destination, "dossier.json"), dossier);
