// og-image.mjs — Régénère public/og-image.png à partir de scripts/og-image.html.
//
// L'image de partage est un PNG : l'accroche y est gravée en dur et ne suit
// pas les balises <meta> de index.html. Changer le slogan du site sans
// relancer ce script laisse l'ancien texte s'afficher dans tous les aperçus
// de lien (WhatsApp, Discord, X, Slack) — un décalage invisible en local,
// puisque rien dans l'application n'affiche cette image.
//
// Playwright n'est pas une dépendance de ce dépôt : ce script ne tourne
// qu'à la demande, quand l'accroche change. Lance-le avec le Playwright
// déjà installé du dépôt backend, ou ponctuellement :
//
//   npx --yes playwright@1.49.1 --version   # amène le binaire
//   node scripts/og-image.mjs
//
// Sur les machines où Chromium est fourni par l'environnement,
// PLAYWRIGHT_BROWSERS_PATH suffit à le retrouver — aucun téléchargement.

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ici = dirname(fileURLToPath(import.meta.url));
const gabarit = resolve(ici, "og-image.html");
const sortie = resolve(ici, "..", "public", "og-image.png");

// Dimensions imposées par les balises og:image:width / og:image:height de
// index.html. Les modifier ici sans les modifier là-bas produirait un aperçu
// déformé chez les clients qui font confiance aux dimensions annoncées.
const LARGEUR = 1200;
const HAUTEUR = 630;

// Playwright exige la version exacte de Chromium qu'il a téléchargée lui-même
// et refuse de démarrer sinon. Sur une machine où le navigateur est fourni par
// l'environnement (conteneur de CI, image de développement), les numéros ne
// correspondent presque jamais. OG_IMAGE_CHROMIUM permet alors de désigner le
// binaire présent plutôt que d'en télécharger un second.
const cheminChromium = process.env.OG_IMAGE_CHROMIUM || undefined;

const navigateur = await chromium.launch(
  cheminChromium ? { executablePath: cheminChromium } : {}
);
try {
  const page = await navigateur.newPage({
    viewport: { width: LARGEUR, height: HAUTEUR },
    // Rend à 2x puis laisse le PNG à sa taille logique : le texte reste net
    // sur les écrans à forte densité, où les aperçus de lien sont agrandis.
    deviceScaleFactor: 2,
  });
  await page.goto(`file://${gabarit}`);
  await page.screenshot({ path: sortie, scale: "css" });
  console.log(`Image de partage régénérée : ${sortie} (${LARGEUR}x${HAUTEUR})`);
} finally {
  await navigateur.close();
}
