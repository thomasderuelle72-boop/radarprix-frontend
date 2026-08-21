// routes.js — Traduction entre l'état de navigation de l'application
// (view / tab / searchTerm / produit ouvert) et l'URL affichée dans la barre
// d'adresse.
//
// Pourquoi pas react-router : toute la navigation passe déjà par un unique
// état `view` dans RadarPrixSite. Y superposer un routeur imposerait de
// redécouper chaque vue en <Route>, pour un résultat identique. On garde donc
// l'état existant et on le synchronise avec l'History API — sans dépendance
// supplémentaire, et sans réécrire les vues.
//
// Ce que ça change pour le visiteur : le bouton retour du navigateur
// fonctionne, chaque page peut être mise en favori ou partagée, et le site
// devient indexable page par page (jusqu'ici, seule l'accueil avait une URL).

/* Correspondance page secondaire <-> chemin, dans les deux sens : une
   seule table, pour qu'un ajout ne puisse pas n'être fait qu'à moitié. */
const CHEMINS_INFO = {
  "a-propos": "/a-propos",
  faq: "/faq",
  contact: "/contact",
  mentions: "/mentions-legales",
  cgu: "/cgu",
  confidentialite: "/confidentialite",
};

const PAGES_INFO = Object.fromEntries(
  Object.entries(CHEMINS_INFO).map(([page, chemin]) => [chemin.slice(1), page])
);

/** État de navigation -> chemin d'URL. */
export function stateToPath({ view, tab, searchTerm, produit, threadId, marchand, membre, infoPage }) {
  switch (view) {
    // Pages secondaires (à propos, FAQ, contact, mentions, CGU,
    // confidentialité). Elles ont leur propre adresse pour deux raisons :
    // un visiteur doit pouvoir envoyer un lien vers une réponse de la FAQ,
    // et ce sont les pages qu'un moteur de recherche lit pour décider si un
    // site de prix est sérieux.
    case "info":
      return CHEMINS_INFO[infoPage] || "/a-propos";
    case "results":
      if (searchTerm) return `/recherche?q=${encodeURIComponent(searchTerm)}`;
      return tab === "erreurs" ? "/erreurs" : "/deals";
    case "dealDetail":
      return produit ? `/produit/${encodeURIComponent(produit)}` : "/";
    case "marchand":
      return marchand ? `/marchand/${encodeURIComponent(marchand)}` : "/";
    case "membre":
      return membre ? `/membre/${encodeURIComponent(membre)}` : "/";
    case "flux":
      return "/bons-plans";
    case "occasion":
      return "/occasion";
    case "favoris":
      return "/favoris";
    case "admin":
      return "/admin";
    case "communaute-picks":
      return "/communaute";
    case "communaute-chat":
      return "/communaute/chat";
    case "communaute-forum":
      return "/communaute/forum";
    case "communaute-forum-thread":
      return threadId ? `/communaute/forum/${threadId}` : "/communaute/forum";
    case "home":
    default:
      return "/";
  }
}

/**
 * Chemin d'URL -> état de navigation.
 * Renvoie toujours un état exploitable : une adresse inconnue ramène à
 * l'accueil plutôt que de laisser l'application dans un état vide.
 */
export function pathToState(pathname, search) {
  const params = new URLSearchParams(search || "");
  const segments = (pathname || "/").split("/").filter(Boolean);

  if (segments.length === 0) return { view: "home" };

  const [premier, deuxieme, troisieme] = segments;

  if (PAGES_INFO[premier]) return { view: "info", infoPage: PAGES_INFO[premier] };

  switch (premier) {
    case "deals":
      return { view: "results", tab: "deals" };
    case "erreurs":
      return { view: "results", tab: "erreurs" };
    case "recherche": {
      const q = params.get("q");
      return q ? { view: "results", searchTerm: q } : { view: "home" };
    }
    case "produit":
      return deuxieme ? { view: "dealDetail", produit: decodeURIComponent(deuxieme) } : { view: "home" };
    case "marchand":
      return deuxieme ? { view: "marchand", marchand: decodeURIComponent(deuxieme) } : { view: "home" };
    case "membre":
      // Le segment est un pseudo, ou un identifiant numérique pour les
      // comptes qui n'en ont pas encore choisi.
      return deuxieme ? { view: "membre", membre: decodeURIComponent(deuxieme) } : { view: "home" };
    case "bons-plans":
      return { view: "flux" };
    case "occasion":
      return { view: "occasion" };
    case "favoris":
      return { view: "favoris" };
    case "admin":
      return { view: "admin" };
    case "communaute":
      if (deuxieme === "chat") return { view: "communaute-chat" };
      if (deuxieme === "forum") {
        return troisieme
          ? { view: "communaute-forum-thread", threadId: Number(troisieme) || null }
          : { view: "communaute-forum" };
      }
      return { view: "communaute-picks" };
    default:
      return { view: "home" };
  }
}

/**
 * Ancien format de lien produit (?produit=Nom), utilisé avant l'introduction
 * des chemins. Les liens déjà partagés doivent continuer de fonctionner.
 */
export function legacyProductParam(search) {
  return new URLSearchParams(search || "").get("produit");
}

/* ── Ouverture d'un profil depuis n'importe où ────────────────────
   Un pseudo est cliquable dans les commentaires, le salon, le forum et
   les deals communautaires — soit quatre composants imbriqués à des
   profondeurs différentes. Faire descendre une fonction `onOpenProfile`
   en propriété jusqu'à chacun d'eux traverserait des composants qui n'ont
   rien à voir avec les profils.

   On enregistre donc ici la fonction de navigation une seule fois (au
   montage de l'application), sur le modèle déjà retenu pour les sessions
   expirées dans api.js. Un simple lien <a href> ne conviendrait pas : il
   rechargerait toute la page au lieu de naviguer côté client.
   ────────────────────────────────────────────────────────────────── */
let navigateurProfil = null;

export function setProfileNavigator(fn) {
  navigateurProfil = fn;
}

/** Ouvre le profil d'un membre (pseudo ou identifiant numérique). */
export function ouvrirProfil(handle) {
  if (handle && navigateurProfil) navigateurProfil(String(handle));
}

/** Y a-t-il quelqu'un pour traiter la navigation ? (sinon : pas de curseur main) */
export function profilNavigable() {
  return Boolean(navigateurProfil);
}
