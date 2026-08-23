// utils.js — petites fonctions pures partagées entre composants.

// "il y a 8 min" / "il y a 2 h" à partir d'un timestamp réel (item.scraped_at,
// colonne SQL existante côté backend) — jamais une donnée inventée.
export function relativeTime(sqlTimestamp) {
  if (!sqlTimestamp) return null;
  const then = new Date(sqlTimestamp.replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(then)) return null;
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

/** Parse une date SQLite ("YYYY-MM-DD HH:MM:SS", toujours UTC). */
function parseSql(sqlTimestamp) {
  if (!sqlTimestamp) return null;
  const t = new Date(String(sqlTimestamp).replace(" ", "T") + "Z");
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * Ancienneté d'un compte, en unité lisible : "Membre depuis 3 jours",
 * "… 5 mois", "… 2 ans". relativeTime s'arrête aux jours, ce qui donnerait
 * "il y a 1825 j" sur un profil ancien.
 */
export function anciennete(sqlTimestamp) {
  const t = parseSql(sqlTimestamp);
  if (!t) return null;
  const jours = Math.max(0, Math.floor((Date.now() - t.getTime()) / 86400000));
  if (jours < 1) return "inscrit aujourd'hui";
  if (jours < 31) return `depuis ${jours} jour${jours > 1 ? "s" : ""}`;
  const mois = Math.floor(jours / 30.44);
  if (mois < 12) return `depuis ${mois} mois`;
  const ans = Math.floor(jours / 365.25);
  return `depuis ${ans} an${ans > 1 ? "s" : ""}`;
}

/** "29 avril 2025" — pour dater un badge ou une fin d'offre. */
export function dateLongue(sqlTimestamp) {
  const t = parseSql(sqlTimestamp);
  if (!t) return null;
  return t.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Une offre dont la date de fin est passée n'est plus valable. */
export function estExpire(sqlTimestamp) {
  const t = parseSql(sqlTimestamp);
  return t ? t.getTime() < Date.now() : false;
}

/** Grands nombres à la française : 54470 -> "54 470". */
export function nombreLisible(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("fr-FR");
}

/** Prix en français : « 299,99 € ». */
export const euros = (n) => `${Number(n).toFixed(2).replace(".", ",")} \u20ac`;

/**
 * Ce que les autres marchands disent du même produit.
 *
 * Le même article publié par deux marchands donnait deux cartes identiques,
 * au même prix, sans que rien ne les relie : un comparateur qui ne compare
 * pas. Le backend les regroupe désormais par clé produit ; il reste à le
 * dire, y compris quand la nouvelle est mauvaise pour nous — si quelqu'un
 * vend moins cher, on l'annonce plutôt que de le taire.
 *
 * Rend `null` quand il n'y a rien à comparer, pour que l'appelant n'ait
 * qu'une condition à écrire.
 */
export function comparaison(item) {
  const autres = Array.isArray(item.autresMarchands) ? item.autresMarchands : [];
  if (!autres.length) return null;

  // La liste est plafonnée à quatre côté serveur ; le décompte, lui, est
  // complet. On compte avec le second et on nomme avec la première, sans
  // quoi une carte annoncerait « 5 marchands » là où il y en a sept.
  const total = Math.max(Number(item.nbMarchands) || 0, autres.length + 1);

  const moinsCher = autres
    .filter((a) => Number(a.prix) > 0 && Number(a.prix) < Number(item.price))
    .sort((a, b) => a.prix - b.prix)[0];

  if (moinsCher) {
    return { libelle: `Moins cher chez ${moinsCher.marchand} : ${euros(moinsCher.prix)}`, alerte: true, total };
  }
  if (total === 2) {
    return { libelle: `Aussi chez ${autres[0].marchand} \u2014 ${euros(autres[0].prix)}`, alerte: false, total };
  }
  return { libelle: `Aussi chez ${total - 1} autres marchands`, alerte: false, total };
}
