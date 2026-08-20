// session.js — Ce que les composants profonds ont besoin de savoir du
// membre connecté, sans le faire descendre en propriété à travers toute
// l'arborescence.
//
// Deux informations seulement : le jeton et le rôle. Elles servent aux
// composants feuilles (une carte de deal, un commentaire) pour afficher —
// ou non — les actions de modération. Les faire transiter en propriétés
// obligerait à modifier une dizaine de composants qui n'ont rien à voir
// avec la modération.
//
// Même procédé que setUnauthorizedHandler dans api.js et setProfileNavigator
// dans routes.js : un état de session enregistré une fois au montage.

let session = { token: null, role: null, userId: null };
const abonnes = new Set();

/** Enregistre la session courante (appelé par RadarPrixSite). */
export function setSession(nouvelle) {
  session = { token: null, role: null, userId: null, ...nouvelle };
  for (const f of abonnes) f(session);
}

export function getSession() {
  return session;
}

/** Le membre connecté peut-il modérer ? */
export function peutModerer() {
  return session.role === "admin" || session.role === "moderator";
}

/**
 * S'abonne aux changements de session. Renvoie la fonction de désabonnement,
 * pour être utilisé tel quel dans un useEffect.
 */
export function onSessionChange(fn) {
  abonnes.add(fn);
  return () => abonnes.delete(fn);
}
