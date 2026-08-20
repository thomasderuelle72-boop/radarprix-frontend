// api/produit.js — Sert une fiche produit avec ses propres balises de partage.
//
// Le problème : les balises Open Graph d'index.html sont écrites en dur et
// valent pour l'application entière. Quand un membre partage un deal sur
// WhatsApp ou Discord, l'aperçu affiche la page d'accueil générique au lieu
// du produit et de son prix — un frein direct au partage, qui est le
// mécanisme de croissance le moins cher du site.
//
// Pourquoi ça ne pouvait pas se régler côté client : les robots des réseaux
// sociaux n'exécutent pas le JavaScript. Ils ne lisent que le HTML servi tel
// quel. Toute balise posée par React arrive trop tard.
//
// Comment : cette fonction récupère la coquille de l'application (app.html,
// copie d'index.html laissée hors réécriture par le build), y remplace les
// balises par celles du produit demandé, et renvoie le tout. Personne n'est
// traité différemment — ni sniffage d'agent utilisateur, ni page dégradée :
// le visiteur reçoit l'application complète et fonctionnelle, le robot
// reçoit les bonnes balises. Les deux lisent le même document.

const BACKEND =
  process.env.VITE_BACKEND_URL || "https://radarprix-backend-production.up.railway.app";
const SITE = process.env.VITE_SITE_URL || "https://radarprix.fr";

/** Échappement pour insertion dans un attribut HTML. */
function echapper(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Remplace la valeur d'une balise meta déjà présente dans le document.
 * On substitue au lieu d'ajouter : deux balises og:title concurrentes
 * laissent le réseau social choisir, et il choisit rarement la bonne.
 */
function remplacerMeta(html, attribut, nom, valeur) {
  const motif = new RegExp(
    `(<meta\\s+${attribut}=["']${nom}["']\\s+content=["'])[^"']*(["'])`,
    "i"
  );
  return html.replace(motif, `$1${echapper(valeur)}$2`);
}

/** Cherche le deal correspondant au nom de produit demandé. */
async function chercherProduit(nom) {
  const url = `${BACKEND}/api/deals?q=${encodeURIComponent(nom)}&pageSize=1`;
  const reponse = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!reponse.ok) return null;
  const { items = [] } = await reponse.json();
  return items[0] || null;
}

export default async function handler(req, res) {
  const nom = decodeURIComponent(String(req.query.nom || "")).trim();

  // La coquille de l'application, telle que produite par le build. Elle est
  // servie en statique et exclue de la réécriture, sans quoi cette fonction
  // s'appellerait elle-même.
  const hote = req.headers["x-forwarded-host"] || req.headers.host;
  const protocole = req.headers["x-forwarded-proto"] || "https";

  let html;
  try {
    const coquille = await fetch(`${protocole}://${hote}/app.html`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!coquille.ok) throw new Error(`coquille indisponible (${coquille.status})`);
    html = await coquille.text();
  } catch (e) {
    // Sans la coquille, on ne peut rien servir d'utile : mieux vaut laisser
    // Vercel servir l'application normalement que renvoyer une page vide.
    console.error(`[produit] ${e.message}`);
    return res.redirect(302, "/");
  }

  let deal = null;
  try {
    deal = await chercherProduit(nom);
  } catch (e) {
    // Le backend peut être lent ou en panne : on sert alors la page avec ses
    // balises d'origine plutôt que d'échouer. Un aperçu générique reste
    // préférable à une erreur.
    console.error(`[produit] backend injoignable : ${e.message}`);
  }

  const titre = deal ? deal.name : nom;
  const url = `${SITE}/produit/${encodeURIComponent(nom)}`;

  let description;
  if (deal && Number.isFinite(deal.price)) {
    const remise = Number.isFinite(deal.pct) && deal.pct > 0 ? ` — ${deal.pct} % sous le prix habituel` : "";
    const chez = deal.seller ? ` chez ${deal.seller}` : "";
    description = `${deal.price} €${chez}${remise}. Prix relevé automatiquement par RadarPrix.`;
  } else {
    description = `Suivez le prix de ${titre} chez les marchands français et recevez une alerte dès qu'il baisse.`;
  }

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${echapper(titre)} — RadarPrix</title>`);
  html = remplacerMeta(html, "name", "description", description);
  html = remplacerMeta(html, "property", "og:title", titre);
  html = remplacerMeta(html, "property", "og:description", description);
  html = remplacerMeta(html, "property", "og:url", url);
  html = remplacerMeta(html, "name", "twitter:title", titre);
  html = remplacerMeta(html, "name", "twitter:description", description);
  html = html.replace(
    /(<link\s+rel=["']canonical["']\s+href=["'])[^"']*(["'])/i,
    `$1${echapper(url)}$2`
  );

  // L'image du produit fait un bien meilleur aperçu que le visuel générique
  // du site — mais seulement si elle existe.
  if (deal && deal.img) {
    html = remplacerMeta(html, "property", "og:image", deal.img);
    html = remplacerMeta(html, "name", "twitter:image", deal.img);
  }

  // Court, car un prix change : assez pour absorber une rafale de partages,
  // pas assez pour figer un prix périmé dans les aperçus.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
