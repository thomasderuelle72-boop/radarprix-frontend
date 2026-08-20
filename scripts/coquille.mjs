// scripts/coquille.mjs — Duplique dist/index.html en dist/app.html après le build.
//
// api/produit.js a besoin de lire la coquille de l'application pour y injecter
// les balises de partage du produit demandé. Elle ne peut pas lire
// « /index.html » : la réécriture de vercel.json y renvoie justement toutes
// les URL inconnues, la fonction finirait par s'appeler elle-même.
//
// D'où cette copie, servie en statique et explicitement exclue de la
// réécriture. Elle porte les mêmes empreintes de fichiers que l'originale
// puisqu'elle en est la copie exacte — aucune divergence possible entre les
// deux, contrairement à un gabarit maintenu à la main.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(RACINE, "dist", "index.html");
const cible = join(RACINE, "dist", "app.html");

if (!existsSync(source)) {
  console.error("[coquille] dist/index.html introuvable — le build a-t-il réussi ?");
  process.exit(1);
}

copyFileSync(source, cible);
console.log("[coquille] dist/app.html écrit (coquille lue par api/produit.js)");
