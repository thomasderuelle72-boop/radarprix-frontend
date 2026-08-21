// api.js — Le seul endroit qui parle au réseau. Centralise l'URL du
// backend et tous les appels fetch, pour que RadarPrixSite.jsx et les
// composants extraits sous components/ (DealCard, ProductDetailView…)
// puissent tous importer les mêmes fonctions sans les dupliquer.

// Adresse du backend. Valeur de production par défaut, pour que le site
// déployé fonctionne sans configuration ; VITE_BACKEND_URL permet de la
// remplacer (backend lancé en local, environnement de test), ce qui était
// impossible tant que l'adresse était figée dans le code.
// ⚠️ Change cette valeur si tu redéploies le backend ailleurs.
export const BACKEND_URL =
  import.meta.env?.VITE_BACKEND_URL || "https://radarprix-backend-production.up.railway.app";

/* ── Session expirée (401) ────────────────────────────────────────
   Le jeton JWT a une durée de vie limitée. Sans traitement, une fois
   expiré, l'interface continuait d'afficher le membre comme connecté et
   chaque action échouait avec un message technique incompréhensible
   ("Le serveur a répondu 401").

   Plutôt que d'ajouter ce test dans les 31 appels du fichier, on déclare
   ici une fonction `fetch` locale : à l'intérieur de ce module, toutes les
   références à `fetch` désignent celle-ci et non celle du navigateur, donc
   aucun appel existant n'a besoin d'être modifié.
   ────────────────────────────────────────────────────────────────── */
const navigateurFetch = globalThis.fetch.bind(globalThis);
let surSessionExpiree = null;

/** Branche la réaction à une session expirée (voir RadarPrixSite : déconnexion). */
export function setUnauthorizedHandler(fn) {
  surSessionExpiree = fn;
}

async function fetch(url, options) {
  const res = await navigateurFetch(url, options);
  // Seuls les appels authentifiés nous intéressent : un 401 sur une route
  // publique voudrait dire autre chose qu'une session expirée.
  const authentifie = Boolean(options?.headers?.Authorization);
  if (res.status === 401 && authentifie && surSessionExpiree) {
    surSessionExpiree();
  }
  return res;
}

// Lit les deals déjà repérés en base (cron), instantané et gratuit.
// `q` (optionnel) filtre par mot-clé sur des deals déjà validés individuellement
// — utilisé pour parcourir les anomalies existantes sur une recherche large
// (ex: "pc") sans lancer de scan en direct sur un terme trop vague pour être comparé.
export async function fetchDeals(category, page, pageSize = 15, q) {
  const params = new URLSearchParams({ category, page, pageSize });
  if (q) params.set("q", q);
  const res = await fetch(`${BACKEND_URL}/api/deals?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Le serveur a répondu ${res.status}`);
  return data; // { category, page, pageSize, total, hasMore, items }
}

// Recherche libre d'un produit précis : celle-ci lance un vrai scan SerpApi en direct.
export async function scanBackend(query, category) {
  const res = await fetch(`${BACKEND_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Le serveur a répondu ${res.status}`);
  return { items: data.items || [], scannedQuery: data.query || query };
}

// Relit le dernier scan déjà enregistré pour une requête suivie (favoris),
// sans en refaire un — utilisé par FavorisView pour afficher le vrai
// prix/score courant de chaque favori, sans nouvelle route backend.
export async function apiGetLatest(query) {
  const params = new URLSearchParams({ query });
  const res = await fetch(`${BACKEND_URL}/api/latest?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Indisponible.");
  return data.items || []; // offres avec verdict !== "normal" (ou [] si aucune anomalie en cours)
}

export async function apiAuth(path, body) {
  const res = await fetch(`${BACKEND_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

/**
 * Suit un produit. `targetPrice` est facultatif : renseigné, le membre est
 * aussi alerté dès que le prix passe sous ce seuil, en plus des erreurs de
 * prix détectées par l'algorithme. Re-suivre un produit déjà suivi met le
 * seuil à jour (le backend fait un ON CONFLICT DO UPDATE).
 */
export async function apiWatchlistAdd(token, query, category, targetPrice) {
  const res = await fetch(`${BACKEND_URL}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, category, targetPrice: targetPrice || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible d'ajouter aux favoris.");
  return data.items || [];
}

export async function apiWatchlistGet(token) {
  const res = await fetch(`${BACKEND_URL}/api/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de charger les favoris.");
  return data.items || [];
}

export async function apiUpdateProfile(token, patch) {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de mettre à jour le profil.");
  return data.user;
}

export async function apiChangePassword(token, currentPassword, newPassword) {
  const res = await fetch(`${BACKEND_URL}/api/auth/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de changer le mot de passe.");
  return data;
}

export async function apiDeleteAccount(token, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de supprimer le compte.");
  return data;
}

export async function apiAdminStats(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Accès refusé.");
  return data;
}


export async function apiGetHistory(query, days = 30) {
  const params = new URLSearchParams({ query, days });
  const res = await fetch(`${BACKEND_URL}/api/history?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Historique indisponible.");
  return data.days || [];
}

export async function apiGetComments(query) {
  const params = new URLSearchParams({ query });
  const res = await fetch(`${BACKEND_URL}/api/comments?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Commentaires indisponibles.");
  return data.items || [];
}

export async function apiPostComment(token, query, body) {
  const res = await fetch(`${BACKEND_URL}/api/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible d'envoyer le commentaire.");
  return data.items || [];
}

export async function apiGetPublicChat(afterId = 0) {
  const params = new URLSearchParams({ afterId });
  const res = await fetch(`${BACKEND_URL}/api/chat/public?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Chat indisponible.");
  return data.items || [];
}

export async function apiPostPublicChat(token, body) {
  const res = await fetch(`${BACKEND_URL}/api/chat/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Envoi impossible.");
  return data;
}

export async function apiGetMembers(token) {
  const res = await fetch(`${BACKEND_URL}/api/members`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Membres indisponibles.");
  return data.items || [];
}

/** Mes conversations privées, avec dernier message et nombre en attente. */
export async function apiGetConversations(token) {
  const res = await fetch(`${BACKEND_URL}/api/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Conversations indisponibles.");
  return { items: data.items || [], nonLus: data.nonLus || 0 };
}

export async function apiGetConversationWith(token, userId) {
  const res = await fetch(`${BACKEND_URL}/api/chat/with/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Conversation indisponible.");
  return data.items || [];
}

export async function apiPostMessageTo(token, userId, body) {
  const res = await fetch(`${BACKEND_URL}/api/chat/with/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Envoi impossible.");
  return data;
}

/**
 * Supprime une conversation POUR SOI. Le serveur n'efface pas les messages :
 * ils appartiennent aussi au correspondant, qui ne les a pas supprimés.
 */
export async function apiSupprimerConversation(token, userId) {
  const res = await fetch(`${BACKEND_URL}/api/chat/with/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Suppression impossible.");
  return data;
}

/** Remet la conversation en attente, pour y revenir plus tard. */
export async function apiConversationNonLue(token, userId) {
  const res = await fetch(`${BACKEND_URL}/api/chat/with/${userId}/non-lu`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Action impossible.");
  return data;
}

/** Supprime un message qu'on a soi-même envoyé. */
export async function apiSupprimerMessage(token, id) {
  const res = await fetch(`${BACKEND_URL}/api/chat/message/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Suppression impossible.");
  return data;
}

/* ── Communauté : deals soumis par les membres + votes de pertinence ── */
export async function apiCommunityListDeals(token, category = "tout", sort = "hot", page = 1, pageSize = 20) {
  const params = new URLSearchParams({ category, sort, page, pageSize });
  const res = await fetch(`${BACKEND_URL}/api/community/deals?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Deals communautaires indisponibles.");
  return data; // { items, total, hasMore, page, pageSize, category, sort }
}

// Fiabilité d'un marchand vue par la communauté (ratio de votes positifs
// sur les deals qui le mentionnent) — indicateur distinct du Deal/Confidence
// Score algorithmique. reliability: null quand jamais mentionné par personne.
export async function apiMerchantReliability(name) {
  const params = new URLSearchParams({ name });
  const res = await fetch(`${BACKEND_URL}/api/merchants/reliability?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Indisponible.");
  return data; // { seller, dealCount, upvotes, downvotes, reliability }
}

export async function apiCommunitySubmitDeal(token, payload) {
  const res = await fetch(`${BACKEND_URL}/api/community/deals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de publier ce deal.");
  return data.deal;
}

export async function apiCommunityVote(token, dealId, value) {
  const res = await fetch(`${BACKEND_URL}/api/community/deals/${dealId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Vote impossible.");
  return data.deal;
}

export async function apiCommunityRemoveVote(token, dealId) {
  const res = await fetch(`${BACKEND_URL}/api/community/deals/${dealId}/vote`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Vote impossible.");
  return data.deal;
}

/* ── Forum : catégories, sujets, réponses ──────────────────────── */
export async function apiForumCategories() {
  const res = await fetch(`${BACKEND_URL}/api/forum/categories`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Catégories indisponibles.");
  return data.items || [];
}

export async function apiForumThreads(slug) {
  const res = await fetch(`${BACKEND_URL}/api/forum/categories/${slug}/threads`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Sujets indisponibles.");
  return data; // { category, items }
}

export async function apiForumCreateThread(token, slug, title, body) {
  const res = await fetch(`${BACKEND_URL}/api/forum/categories/${slug}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de créer ce sujet.");
  return data.thread;
}

export async function apiForumThread(threadId) {
  const res = await fetch(`${BACKEND_URL}/api/forum/threads/${threadId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Sujet indisponible.");
  return data; // { thread, replies }
}

export async function apiForumReply(token, threadId, body) {
  const res = await fetch(`${BACKEND_URL}/api/forum/threads/${threadId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Réponse impossible.");
  return data.replies || [];
}

/* ── Profils publics de membres ──────────────────────────────────
   Consultables sans être connecté : le jeton n'est transmis que pour
   savoir si le visiteur suit déjà ce membre. */

export async function apiMemberProfile(handle, token) {
  const res = await fetch(`${BACKEND_URL}/api/members/${encodeURIComponent(handle)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Membre introuvable.");
  return data; // { membre, stats, badges, prochainsBadges, jeLeSuis, cestMoi }
}

export async function apiMemberActivity(handle) {
  const res = await fetch(`${BACKEND_URL}/api/members/${encodeURIComponent(handle)}/activity`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Activité indisponible.");
  return data.items || [];
}

export async function apiMemberDeals(handle, token) {
  const res = await fetch(`${BACKEND_URL}/api/members/${encodeURIComponent(handle)}/deals`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Deals indisponibles.");
  return data.items || [];
}

export async function apiMemberThreads(handle) {
  const res = await fetch(`${BACKEND_URL}/api/members/${encodeURIComponent(handle)}/threads`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Discussions indisponibles.");
  return data.items || [];
}

export async function apiFollowMember(token, handle, suivre) {
  const res = await fetch(`${BACKEND_URL}/api/members/${encodeURIComponent(handle)}/follow`, {
    method: suivre ? "POST" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Action impossible.");
  return data; // { jeLeSuis, abonnes }
}

/** Les deals publiés par les membres qu'on suit. */
export async function apiFollowingFeed(token) {
  const res = await fetch(`${BACKEND_URL}/api/feed/following`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fil indisponible.");
  return data; // { suivis, items }
}

/* ── Administration et modération ─────────────────────────────────
   Toutes ces routes exigent le rôle administrateur ou modérateur ; le
   backend refuse par un 403 si le jeton ne le porte pas. */

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const authJson = (token) => ({ "Content-Type": "application/json", ...auth(token) });

/** Enveloppe commune : un seul endroit pour lire l'erreur renvoyée. */
async function adminFetch(url, options, messageDefaut) {
  const res = await fetch(`${BACKEND_URL}${url}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || messageDefaut);
  return data;
}

// ── Signalement (côté membre) ──
export function apiSignaler(token, type, id, reason, note) {
  return adminFetch(
    "/api/reports",
    { method: "POST", headers: authJson(token), body: JSON.stringify({ type, id, reason, note }) },
    "Signalement impossible."
  );
}

// ── Modération ──
export const apiModReports = (token, status = "ouvert") =>
  adminFetch(`/api/moderation/reports?status=${status}`, { headers: auth(token) }, "File indisponible.");

export const apiModSupprimer = (token, type, id, motif) =>
  adminFetch(
    `/api/moderation/content/${type}/${id}`,
    { method: "DELETE", headers: authJson(token), body: JSON.stringify({ motif }) },
    "Suppression impossible."
  );

export const apiModRejeterSignalement = (token, id) =>
  adminFetch(`/api/moderation/reports/${id}/reject`, { method: "POST", headers: auth(token) }, "Action impossible.");

export const apiModSuspendre = (token, userId, jours, motif) =>
  adminFetch(
    `/api/moderation/users/${userId}/suspend`,
    { method: "POST", headers: authJson(token), body: JSON.stringify({ jours, motif }) },
    "Suspension impossible."
  );

export const apiModEpingler = (token, dealId, epingle) =>
  adminFetch(
    `/api/moderation/deals/${dealId}/pin`,
    { method: "POST", headers: authJson(token), body: JSON.stringify({ epingle }) },
    "Action impossible."
  );

export const apiModJournal = (token) =>
  adminFetch("/api/moderation/log", { headers: auth(token) }, "Journal indisponible.");

export const apiAdminRole = (token, userId, role) =>
  adminFetch(
    `/api/admin/users/${userId}/role`,
    { method: "POST", headers: authJson(token), body: JSON.stringify({ role }) },
    "Changement de rôle impossible."
  );

// ── Santé du site ──
export const apiAdminHealth = (token) =>
  adminFetch("/api/admin/health", { headers: auth(token) }, "État indisponible.");

// ── Membres ──
export const apiAdminMembers = (token, params = {}) =>
  adminFetch(
    `/api/admin/members?${new URLSearchParams(params)}`,
    { headers: auth(token) },
    "Liste indisponible."
  );

export const apiAdminMemberSheet = (token, id) =>
  adminFetch(`/api/admin/members/${id}`, { headers: auth(token) }, "Fiche indisponible.");

export const apiAdminActivity = (token, jours = 30) =>
  adminFetch(`/api/admin/activity?jours=${jours}`, { headers: auth(token) }, "Activité indisponible.");

/**
 * Télécharge un export CSV. Passe par un blob plutôt que par un simple lien :
 * la route exige un en-tête d'autorisation, qu'un <a href> ne peut pas porter.
 */
export async function apiAdminExport(token, quoi) {
  const res = await fetch(`${BACKEND_URL}/api/admin/export/${quoi}.csv`, { headers: auth(token) });
  if (!res.ok) throw new Error("Export impossible.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `radarprix-${quoi}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── Flux unifié des bons plans ───────────────────────────────────
   Le backend distingue désormais quatre détecteurs et cinq natures de bons
   plans (erreur de prix, promotion, code promo, gratuit, offre de
   remboursement). Trois d'entre elles ne laissent aucune trace dans le prix
   affiché : elles étaient donc invisibles à un site bâti uniquement sur la
   comparaison de prix.
   ────────────────────────────────────────────────────────────────── */

/** Flux principal, filtrable par nature et par catégorie. */
export async function apiFeed({ type, category = "tout", page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ category, page, pageSize });
  if (type && type !== "tout") params.set("type", type);
  const res = await fetch(`${BACKEND_URL}/api/feed?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Le serveur a répondu ${res.status}`);
  return data;
}

/** Section occasion / reconditionné, volontairement séparée du flux principal. */
export async function apiFeedOccasion({ etat = "reconditionne", category = "tout", page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ etat, category, page, pageSize });
  const res = await fetch(`${BACKEND_URL}/api/feed/occasion?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Le serveur a répondu ${res.status}`);
  return data;
}


/* ── Administration du flux et de la mesure ───────────────────── */

/** État public du radar : fiches suivies, dernier balayage, détections en cours. */
export async function fetchRadar() {
  const res = await fetch(`${BACKEND_URL}/api/radar`);
  if (!res.ok) throw new Error(`Le serveur a répondu ${res.status}`);
  return res.json();
}

/** Ce qui attend le membre : messages privés et notifications, en un appel. */
export const apiActivite = (token) =>
  adminFetch("/api/activite", { headers: auth(token) }, "Activité indisponible.");

export const apiNotifications = (token) =>
  adminFetch("/api/notifications", { headers: auth(token) }, "Notifications indisponibles.");

export const apiNotificationsLues = (token, ids = null) =>
  adminFetch(
    "/api/notifications/lues",
    {
      method: "POST",
      headers: { ...auth(token), "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    },
    "Marquage impossible."
  );
