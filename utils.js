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
