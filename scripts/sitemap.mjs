// scripts/sitemap.mjs — Génère public/sitemap.xml avant le build.
//
// Le site n'avait aucun plan : les moteurs devaient découvrir chaque page en
// suivant des liens rendus par JavaScript, ce qu'ils font mal et tard. Or
// depuis routes.js, chaque vue a une vraie URL — il ne manquait que de les
// déclarer.
//
// Deux natures d'entrées :
//   · les pages fixes, connues sans rien interroger ;
//   · les fiches produits, tirées du backend au moment du build. Si le
//     backend ne répond pas, on publie quand même le plan des pages fixes :
//     un plan partiel vaut mieux qu'un build cassé, et surtout mieux que
//     pas de plan du tout.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const SITE = process.env.VITE_SITE_URL || "https://radarprix.fr";
const BACKEND = process.env.VITE_BACKEND_URL || "https://radarprix-backend-production.up.railway.app";

// `priority` et `changefreq` sont des indications, pas des ordres : les
// moteurs les pondèrent librement. On reste sobre — un site qui se déclare
// partout en priorité 1.0 ne dit rien du tout.
const PAGES_FIXES = [
  { chemin: "/", priorite: "1.0", frequence: "hourly" },
  { chemin: "/bons-plans", priorite: "0.9", frequence: "hourly" },
  { chemin: "/deals", priorite: "0.8", frequence: "hourly" },
  { chemin: "/erreurs", priorite: "0.9", frequence: "hourly" },
  { chemin: "/occasion", priorite: "0.7", frequence: "daily" },
  { chemin: "/communaute", priorite: "0.6", frequence: "daily" },
  { chemin: "/communaute/forum", priorite: "0.6", frequence: "daily" },
];

const echapper = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Fiches produits actuellement au flux. Silencieux en cas d'échec. */
async function fichesProduits() {
  try {
    const reponse = await fetch(`${BACKEND}/api/deals?pageSize=50`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!reponse.ok) throw new Error(`le backend a répondu ${reponse.status}`);
    const { items = [] } = await reponse.json();

    // Un même produit peut être détecté chez plusieurs marchands : le plan
    // ne doit le déclarer qu'une fois, la fiche étant la même.
    const vus = new Set();
    const chemins = [];
    for (const item of items) {
      if (!item.name || vus.has(item.name)) continue;
      vus.add(item.name);
      chemins.push(`/produit/${encodeURIComponent(item.name)}`);
    }
    return chemins;
  } catch (e) {
    console.warn(`[sitemap] fiches produits non récupérées (${e.message}) — plan limité aux pages fixes`);
    return [];
  }
}

const aujourdhui = new Date().toISOString().slice(0, 10);

const entree = ({ chemin, priorite = "0.5", frequence = "weekly" }) =>
  `  <url>
    <loc>${echapper(SITE + chemin)}</loc>
    <lastmod>${aujourdhui}</lastmod>
    <changefreq>${frequence}</changefreq>
    <priority>${priorite}</priority>
  </url>`;

const produits = await fichesProduits();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  ...PAGES_FIXES.map(entree),
  ...produits.map((chemin) => entree({ chemin, priorite: "0.7", frequence: "daily" })),
].join("\n")}
</urlset>
`;

mkdirSync(join(RACINE, "public"), { recursive: true });
writeFileSync(join(RACINE, "public", "sitemap.xml"), xml, "utf8");
console.log(`[sitemap] ${PAGES_FIXES.length} page(s) fixe(s) + ${produits.length} fiche(s) produit → public/sitemap.xml`);
