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
