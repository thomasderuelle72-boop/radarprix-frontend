// api.js — Le seul endroit qui parle au réseau. Centralise l'URL du
// backend et tous les appels fetch, pour que RadarPrixSite.jsx et les
// composants extraits sous components/ (DealCard, ProductDetailView…)
// puissent tous importer les mêmes fonctions sans les dupliquer.

// ⚠️ Change cette URL si tu redéploies le backend ailleurs.
export const BACKEND_URL = "https://radarprix-backend-production.up.railway.app";

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

export async function apiWatchlistAdd(token, query, category) {
  const res = await fetch(`${BACKEND_URL}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, category }),
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

export async function apiAdminUsers(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Accès refusé.");
  return data.users || [];
}

export async function apiAdminTriggerScan(token, size) {
  const res = await fetch(`${BACKEND_URL}/api/admin/trigger-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ size }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Le scan a échoué.");
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

export async function apiGetConversations(token) {
  const res = await fetch(`${BACKEND_URL}/api/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Conversations indisponibles.");
  return data.items || [];
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
