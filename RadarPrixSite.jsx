import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ════════════════════════════════════════════════════════════════
   RADARPRIX v4 — branché sur le vrai backend (Railway + SerpApi).
   Plus aucun appel à l'API Claude : les scans interrogent Google
   Shopping via ton propre serveur, et l'algorithme de détection
   tourne côté serveur (src/algorithm.js), en pur code.
   ════════════════════════════════════════════════════════════════ */

// ⚠️ Change cette URL si tu redéploies le backend ailleurs.
const BACKEND_URL = "https://radarprix-backend-production.up.railway.app";

const T = {
  bg: "#0C0E14",
  surface: "#151926",
  surface2: "#1B2032",
  ink: "#F2F4F8",
  sub: "#8B93A7",
  ember: "linear-gradient(90deg, #FF5A2C, #FFB13D)",
  emberSolid: "#FF6A35",
  red: "#FF3B30",
  green: "#2FD98B",
  yellow: "#FFC53D",
  line: "#232838",
};

const CATEGORIES = [
  { id: "tout", label: "Toutes catégories" },
  { id: "hightech", label: "High-tech / Informatique" },
  { id: "gaming", label: "Gaming / PC gamer" },
  { id: "maison", label: "Maison / Électroménager" },
  { id: "mode", label: "Mode / Vêtements" },
  { id: "beaute", label: "Beauté / Hygiène" },
  { id: "alimentaire", label: "Alimentaire / Boissons" },
  { id: "sport", label: "Sport / Plein air" },
  { id: "auto", label: "Auto / Moto" },
];

/* ── Appels au backend (le seul endroit qui parle au réseau) ──── */

// Lit les deals déjà repérés en base (cron), instantané et gratuit.
async function fetchDeals(category, page, pageSize = 15) {
  const params = new URLSearchParams({ category, page, pageSize });
  const res = await fetch(`${BACKEND_URL}/api/deals?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Le serveur a répondu ${res.status}`);
  return data; // { category, page, pageSize, total, hasMore, items }
}

// Recherche libre d'un produit précis : celle-ci lance un vrai scan SerpApi en direct.
async function scanBackend(query, category) {
  const res = await fetch(`${BACKEND_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Le serveur a répondu ${res.status}`);
  return { items: data.items || [], scannedQuery: data.query || query };
}

async function apiAuth(path, body) {
  const res = await fetch(`${BACKEND_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

async function apiWatchlistAdd(token, query, category) {
  const res = await fetch(`${BACKEND_URL}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible d'ajouter aux favoris.");
  return data.items || [];
}

async function apiWatchlistGet(token) {
  const res = await fetch(`${BACKEND_URL}/api/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de charger les favoris.");
  return data.items || [];
}

async function apiUpdateProfile(token, patch) {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de mettre à jour le profil.");
  return data.user;
}

async function apiChangePassword(token, currentPassword, newPassword) {
  const res = await fetch(`${BACKEND_URL}/api/auth/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de changer le mot de passe.");
  return data;
}

async function apiDeleteAccount(token, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de supprimer le compte.");
  return data;
}

async function apiAdminStats(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Accès refusé.");
  return data;
}

async function apiAdminUsers(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Accès refusé.");
  return data.users || [];
}

async function apiAdminTriggerScan(token, size) {
  const res = await fetch(`${BACKEND_URL}/api/admin/trigger-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ size }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Le scan a échoué.");
  return data;
}

async function apiGetHistory(query, days = 30) {
  const params = new URLSearchParams({ query, days });
  const res = await fetch(`${BACKEND_URL}/api/history?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Historique indisponible.");
  return data.days || [];
}

async function apiGetComments(query) {
  const params = new URLSearchParams({ query });
  const res = await fetch(`${BACKEND_URL}/api/comments?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Commentaires indisponibles.");
  return data.items || [];
}

async function apiPostComment(token, query, body) {
  const res = await fetch(`${BACKEND_URL}/api/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible d'envoyer le commentaire.");
  return data.items || [];
}

async function apiGetPublicChat(afterId = 0) {
  const params = new URLSearchParams({ afterId });
  const res = await fetch(`${BACKEND_URL}/api/chat/public?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Chat indisponible.");
  return data.items || [];
}

async function apiPostPublicChat(token, body) {
  const res = await fetch(`${BACKEND_URL}/api/chat/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Envoi impossible.");
  return data;
}

async function apiGetMembers(token) {
  const res = await fetch(`${BACKEND_URL}/api/members`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Membres indisponibles.");
  return data.items || [];
}

async function apiGetConversations(token) {
  const res = await fetch(`${BACKEND_URL}/api/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Conversations indisponibles.");
  return data.items || [];
}

async function apiGetConversationWith(token, userId) {
  const res = await fetch(`${BACKEND_URL}/api/chat/with/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Conversation indisponible.");
  return data.items || [];
}

async function apiPostMessageTo(token, userId, body) {
  const res = await fetch(`${BACKEND_URL}/api/chat/with/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Envoi impossible.");
  return data;
}

/* ── Styles globaux ─────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Inter:wght@400;600;800&display=swap');
    * { box-sizing: border-box; margin: 0; }
    body { background: ${T.bg}; }
    .rp-display { font-family: 'Unbounded', system-ui, sans-serif; }
    .rp-body { font-family: 'Inter', system-ui, sans-serif; }
    @keyframes priceGlitch {
      0%, 38% { transform: translateY(0); }
      45%, 88% { transform: translateY(-100%); }
      95%, 100% { transform: translateY(0); }
    }
    @keyframes sweep { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp .5s ease both; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
    button:focus-visible, a:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid ${T.emberSolid}; outline-offset: 2px; }
    details.rp-faq { border-bottom: 1px solid ${T.line}; padding: 16px 0; }
    details.rp-faq summary { cursor: pointer; font-weight: 800; font-size: 15px; color: ${T.ink}; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    details.rp-faq summary::after { content: '+'; font-size: 20px; color: ${T.emberSolid}; flex-shrink: 0; }
    details.rp-faq[open] summary::after { content: '−'; }
    details.rp-faq p { margin-top: 10px; color: ${T.sub}; font-size: 14px; line-height: 1.65; }
    select, input { color-scheme: dark; }
    .rp-tab { background: none; border: none; color: ${T.sub}; font-weight: 800; font-size: 13px; cursor: pointer; padding: 8px 4px; font-family: 'Inter', system-ui, sans-serif; border-bottom: 2.5px solid transparent; }
    .rp-tab:hover { color: ${T.ink}; }
    .rp-tab.active { color: ${T.ink}; border-bottom-color: ${T.emberSolid}; }
  `}</style>
);

/* ── Barre de recherche ─────────────────────────────────────── */
function SearchBar({ onSearch, big, placeholder }) {
  const [q, setQ] = useState("");
  const go = () => {
    if (q.trim()) {
      onSearch(q.trim());
      setQ("");
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, width: "100%" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder={placeholder || "Rechercher un produit, une marque…"}
        aria-label="Rechercher un produit"
        style={{
          flex: 1,
          padding: big ? "16px 18px" : "11px 14px",
          borderRadius: big ? 14 : 10,
          border: `1.5px solid ${T.line}`,
          fontSize: big ? 16 : 14,
          background: T.surface2,
          color: T.ink,
          fontFamily: "'Inter', system-ui, sans-serif",
          minWidth: 0,
        }}
      />
      <button
        onClick={go}
        aria-label="Lancer la recherche"
        style={{
          padding: big ? "0 24px" : "0 18px",
          borderRadius: big ? 14 : 10,
          border: "none",
          background: T.ember,
          color: "#0C0E14",
          fontWeight: 900,
          fontSize: big ? 15 : 13,
          cursor: "pointer",
          fontFamily: "'Inter', system-ui, sans-serif",
          flexShrink: 0,
        }}
      >
        🔎
      </button>
    </div>
  );
}

/* ── Avatar : photo si dispo, sinon initiale colorée (déterministe) ─ */
const AVATAR_COLORS = ["#FF6A35", "#2FD98B", "#1F5EFF", "#FFC53D", "#FF3B30", "#A855F7"];
function colorFor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function Avatar({ email, pseudo, avatarUrl, size = 32 }) {
  const label = pseudo || email || "?";
  const initial = label.trim()[0]?.toUpperCase() || "?";
  const [imgFailed, setImgFailed] = useState(false);
  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={label}
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorFor(label),
        color: "#0C0E14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: size * 0.45,
        fontFamily: "'Unbounded', system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}


function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiAuth(mode === "login" ? "login" : "register", { email, password });
      onSuccess(data.token, data.user);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "26px 22px", maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="rp-display" style={{ fontSize: 17, color: T.ink }}>{mode === "login" ? "Connexion" : "Créer un compte"}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub }}>×</button>
        </div>

        <label style={{ display: "block", fontSize: 12, color: T.sub, marginBottom: 4 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 14, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}
        />

        <label style={{ display: "block", fontSize: 12, color: T.sub, marginBottom: 4 }}>Mot de passe {mode === "register" && "(8 caractères min.)"}</label>
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 14, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}
        />

        {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: loading ? T.surface2 : T.ember, color: loading ? T.sub : "#0C0E14", fontWeight: 900, fontSize: 14, cursor: loading ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
          {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", textAlign: "center" }}
        >
          {mode === "login" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </form>
    </div>
  );
}

/* ── Menu déroulant de profil ──────────────────────────────── */
function ProfileMenu({ user, role, onOpenSettings, onLogout, onOpenAdmin }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 240,
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        zIndex: 60,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 14px" }}>
        <Avatar email={user.email} pseudo={user.pseudo} avatarUrl={user.avatar_url} size={38} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.pseudo || user.email}
          </div>
          <div style={{ fontSize: 11, color: T.sub }}>{role === "admin" ? "🛡️ Administrateur" : "Membre"}</div>
        </div>
      </div>

      {[
        ["⚙️ Paramètres du compte", onOpenSettings, T.ink],
        ...(role === "admin" ? [["🛡️ Tableau de bord admin", onOpenAdmin, T.yellow]] : []),
        ["Se déconnecter", onLogout, T.sub],
      ].map(([label, action, color]) => (
        <button
          key={label}
          onClick={action}
          style={{ width: "100%", textAlign: "left", padding: "10px 8px", borderRadius: 8, border: "none", background: "transparent", color, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Paramètres du compte : modale à onglets (Compte / Sécurité) ─ */
function SettingsModal({ user, token, onClose, onUpdated, onAccountDeleted }) {
  const [tab, setTab] = useState("compte"); // compte | securite

  // Onglet Compte
  const [pseudo, setPseudo] = useState(user.pseudo || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await apiUpdateProfile(token, { pseudo, avatarUrl });
      onUpdated(updated);
      setProfileMsg("✓ Profil mis à jour");
    } catch (e) {
      setProfileMsg("Erreur : " + e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Onglet Sécurité — mot de passe
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const changePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 8) return setPwMsg("Erreur : le nouveau mot de passe doit faire au moins 8 caractères.");
    if (newPw !== confirmPw) return setPwMsg("Erreur : les deux mots de passe ne correspondent pas.");
    setSavingPw(true);
    try {
      await apiChangePassword(token, oldPw, newPw);
      setPwMsg("✓ Mot de passe changé");
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) {
      setPwMsg("Erreur : " + e.message);
    } finally {
      setSavingPw(false);
    }
  };

  // Onglet Sécurité — suppression de compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await apiDeleteAccount(token, deletePw);
      onAccountDeleted();
    } catch (e) {
      setDeleteMsg(e.message);
      setDeleting(false);
    }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif" };
  const cardStyle = { background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16, marginBottom: 14 };
  const btnStyle = (disabled) => ({ padding: "10px 18px", borderRadius: 8, border: "none", background: disabled ? T.line : T.ember, color: disabled ? T.sub : "#0C0E14", fontWeight: 800, fontSize: 13, cursor: disabled ? "default" : "pointer", fontFamily: "'Inter', sans-serif" });

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${T.line}` }}>
          <h3 className="rp-display" style={{ fontSize: 16, color: T.ink }}>⚙️ Paramètres</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub }}>×</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 4, padding: "14px 12px", borderBottom: `1px solid ${T.line}`, width: "100%" }}>
            <button onClick={() => setTab("compte")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "compte" ? T.surface2 : "transparent", color: tab === "compte" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              👤 Compte général
            </button>
            <button onClick={() => setTab("securite")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "securite" ? T.surface2 : "transparent", color: tab === "securite" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              🔒 Confidentialité & sécurité
            </button>
          </div>

          <div style={{ padding: 20, width: "100%" }}>
            {tab === "compte" && (
              <div style={cardStyle}>
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Profil public</h4>
                <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>Visible par les autres membres dans le salon et les commentaires.</p>

                <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Email (privé, jamais affiché publiquement)</label>
                <input value={user.email} disabled style={{ ...inputStyle, marginBottom: 14, opacity: 0.6, cursor: "not-allowed" }} />

                <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Pseudo</label>
                <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={30} placeholder="Ton pseudo" style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Photo de profil (lien URL)</label>
                <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" style={{ ...inputStyle, marginBottom: 14 }} />

                {profileMsg && <p style={{ fontSize: 12, color: profileMsg.startsWith("Erreur") ? T.red : T.green, marginBottom: 10 }}>{profileMsg}</p>}
                <button onClick={saveProfile} disabled={savingProfile} style={btnStyle(savingProfile)}>
                  {savingProfile ? "…" : "Enregistrer"}
                </button>
              </div>
            )}

            {tab === "securite" && (
              <>
                <div style={cardStyle}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 14 }}>Mot de passe</h4>
                  <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Mot de passe actuel</label>
                  <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                  <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Nouveau mot de passe</label>
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                  <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Confirmer le nouveau mot de passe</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
                  {pwMsg && <p style={{ fontSize: 12, color: pwMsg.startsWith("Erreur") ? T.red : T.green, marginBottom: 10 }}>{pwMsg}</p>}
                  <button onClick={changePassword} disabled={savingPw} style={btnStyle(savingPw)}>
                    {savingPw ? "…" : "Changer le mot de passe"}
                  </button>
                </div>

                <div style={{ ...cardStyle, border: `1px solid ${T.red}55`, marginBottom: 0 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 800, color: T.red, marginBottom: 4 }}>Zone de danger</h4>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>Supprime définitivement ton compte, tes favoris, commentaires et messages. Action irréversible.</p>

                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "10px 18px", borderRadius: 8, border: `1.5px solid ${T.red}`, background: "transparent", color: T.red, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      Supprimer mon compte
                    </button>
                  ) : (
                    <>
                      <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 4 }}>Confirme avec ton mot de passe</label>
                      <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
                      {deleteMsg && <p style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{deleteMsg}</p>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={deleteAccount} disabled={deleting} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: T.red, color: "#fff", fontWeight: 800, fontSize: 13, cursor: deleting ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
                          {deleting ? "…" : "Confirmer la suppression"}
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeletePw(""); setDeleteMsg(null); }} style={{ padding: "10px 18px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: "transparent", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                          Annuler
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mini-graphique d'historique de prix (dépliable) ──────────── */
function PriceHistoryPanel({ query }) {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiGetHistory(query)
      .then((d) => !cancelled && setDays(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [query]);

  if (error) return <p style={{ fontSize: 12, color: T.sub }}>Historique indisponible.</p>;
  if (!days) return <p style={{ fontSize: 12, color: T.sub }}>Chargement…</p>;
  if (days.length < 2) return <p style={{ fontSize: 12, color: T.sub }}>Pas encore assez de données pour un graphique — revenez dans quelques jours.</p>;

  const chartData = days.map((d) => ({ day: d.day.slice(5), prix: Math.round(d.avg_price) }));
  return (
    <div style={{ height: 140, marginTop: 4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.sub }} axisLine={{ stroke: T.line }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: T.ink }} formatter={(v) => [`${v} €`, "Prix moyen"]} />
          <Line type="monotone" dataKey="prix" stroke={T.emberSolid} strokeWidth={2} dot={{ r: 3, fill: T.emberSolid }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Fil de commentaires d'un deal (dépliable) ─────────────────── */
function CommentsPanel({ query, authToken, onNeedAuth }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    apiGetComments(query).then(setComments).catch((e) => setError(e.message));
  };
  useEffect(load, [query]);

  const send = async () => {
    if (!authToken) return onNeedAuth();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const items = await apiPostComment(authToken, query, text.trim());
      setComments(items);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ marginTop: 4 }}>
      {!comments && <p style={{ fontSize: 12, color: T.sub }}>Chargement…</p>}
      {comments?.length === 0 && <p style={{ fontSize: 12, color: T.sub }}>Aucun commentaire pour l'instant — sois le premier.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {comments?.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 8 }}>
            <Avatar email={c.author} avatarUrl={c.avatar_url} size={22} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12 }}>
                <strong style={{ color: T.ink }}>{c.author}</strong>{" "}
                <span style={{ color: T.sub, fontSize: 10.5 }}>{c.created_at?.slice(0, 16).replace("T", " ")}</span>
              </div>
              <div style={{ fontSize: 13, color: T.ink }}>{c.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={500}
          placeholder={authToken ? "Ajouter un commentaire…" : "Connecte-toi pour commenter"}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13, fontFamily: "'Inter', sans-serif" }}
        />
        <button
          onClick={send}
          disabled={sending}
          style={{ padding: "0 14px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          Envoyer
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: T.red, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function Sticker({ item, authToken, onNeedAuth }) {
  const isGem = item.score >= 85;
  const isErr = item.verdict === "erreur";
  const [panel, setPanel] = useState(null); // null | "history" | "comments"

  return (
    <div
      className="fade-up"
      style={{
        background: T.surface,
        border: isGem ? `1.5px solid ${T.yellow}` : `1.5px solid ${isErr ? T.red : T.line}`,
        boxShadow: isGem ? `0 0 24px ${T.yellow}22` : "none",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {(isGem || item.allTimeLow) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isGem && (
            <div className="rp-display" style={{ fontSize: 11, letterSpacing: "0.08em", color: T.yellow }}>
              💎 PÉPITE · score {item.score}/100
            </div>
          )}
          {item.allTimeLow && (
            <div className="rp-display" style={{ fontSize: 11, letterSpacing: "0.04em", color: T.green }}>
              🏆 Prix le plus bas jamais vu
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        {item.img && (
          <img
            src={item.img}
            alt={item.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 10, background: T.surface2, border: `1px solid ${T.line}`, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.35, color: T.ink }}>{item.name}</div>
            <span
              style={{
                background: isErr ? T.red : T.yellow,
                color: "#0C0E14",
                fontFamily: "'Unbounded', system-ui, sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.07em",
                padding: "5px 9px",
                borderRadius: 6,
                alignSelf: "flex-start",
                whiteSpace: "nowrap",
              }}
            >
              {isErr ? "ERREUR ?" : "GROS DEAL"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="rp-display" style={{ fontSize: 24, fontWeight: 900, color: isErr ? T.red : T.ink }}>
              {Number(item.price).toFixed(2).replace(".", ",")} €
            </span>
            {item.refPrice > 0 && (
              <span style={{ color: T.sub, textDecoration: "line-through", fontSize: 14 }}>
                {Number(item.refPrice).toFixed(0)} €
              </span>
            )}
            {item.pct > 0 && <span style={{ color: isErr ? T.red : T.green, fontWeight: 800, fontSize: 14 }}>−{item.pct}%</span>}
          </div>
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
            {item.seller && <strong style={{ color: T.ink }}>{item.seller}</strong>}
            {item.seller && " · "}
            référence {Math.round(item.refPrice)} €
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "9px 16px", borderRadius: 8, background: isErr ? T.red : T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, textDecoration: "none" }}
          >
            Voir l'offre →
          </a>
        )}
        <button
          onClick={() => setPanel(panel === "history" ? null : "history")}
          style={{ padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: panel === "history" ? T.surface2 : "transparent", color: T.sub, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          📈 Historique
        </button>
        <button
          onClick={() => setPanel(panel === "comments" ? null : "comments")}
          style={{ padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: panel === "comments" ? T.surface2 : "transparent", color: T.sub, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          💬 Discussion
        </button>
      </div>

      {panel === "history" && <PriceHistoryPanel query={item.name} />}
      {panel === "comments" && <CommentsPanel query={item.name} authToken={authToken} onNeedAuth={onNeedAuth} />}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 13px",
        borderRadius: 20,
        border: `1.5px solid ${active ? T.emberSolid : T.line}`,
        background: active ? "rgba(255,106,53,0.15)" : "transparent",
        color: active ? T.ink : T.sub,
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

/* ── Pages légales ──────────────────────────────────────────── */
const LEGAL = {
  mentions: {
    title: "Mentions légales",
    body: `Éditeur du site : [Nom / raison sociale à compléter]
Statut : [auto-entrepreneur, SAS…] — SIREN : [à compléter]
Adresse : [à compléter] — Contact : [email à compléter]
Directeur de la publication : [à compléter]
Hébergeur du site : [à compléter] — Hébergeur du backend : Railway Corp.

RadarPrix est un service d'information sur les prix. Les offres affichées proviennent d'une analyse automatique de données de marchés (Google Shopping) ; RadarPrix n'est ni vendeur, ni intermédiaire de vente.`,
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    body: `1. Objet — RadarPrix détecte des variations de prix inhabituelles sur des sites marchands tiers et les présente à titre purement informatif, via un algorithme de comparaison de prix.

2. Absence de garantie — Les prix, remises et disponibilités affichés sont estimés au moment du scan et peuvent changer à tout moment. RadarPrix ne garantit ni l'exactitude des offres, ni leur maintien par le vendeur. En droit français, un vendeur peut annuler une commande en cas d'erreur manifeste sur le prix (prix dérisoire).

3. Responsabilité — L'utilisateur reste seul responsable de ses achats. Vérifiez systématiquement l'offre, le vendeur et les conditions sur le site marchand avant tout paiement.

4. Usage — Le service est fourni « en l'état », pour un usage personnel et raisonnable.`,
  },
  confidentialite: {
    title: "Politique de confidentialité",
    body: `RadarPrix ne crée pas de compte et ne dépose pas de cookie publicitaire.

Les recherches que vous lancez sont envoyées à notre serveur, qui interroge Google Shopping (via SerpApi) pour trouver les prix actuels. L'historique des prix consultés est conservé côté serveur pour améliorer la détection, sans donnée personnelle associée.

Pour toute question : [email de contact à compléter].

[À faire relire par un professionnel avant mise en ligne commerciale — RGPD.]`,
  },
};

function LegalModal({ page, onClose }) {
  if (!page) return null;
  const { title, body } = LEGAL[page];
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "26px 22px", maxWidth: 560, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="rp-display" style={{ fontSize: 17, color: T.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub }}>×</button>
        </div>
        <p style={{ whiteSpace: "pre-line", fontSize: 13.5, lineHeight: 1.7, color: T.sub }}>{body}</p>
      </div>
    </div>
  );
}

function Footer({ setLegalPage }) {
  return (
    <footer style={{ background: "#080A0F", borderTop: `1px solid ${T.line}`, marginTop: 40 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="rp-display" style={{ color: T.ink, fontSize: 15, fontWeight: 900 }}>
          RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
          {[["mentions", "Mentions légales"], ["cgu", "CGU"], ["confidentialite", "Confidentialité"]].map(([id, label]) => (
            <button key={id} onClick={() => setLegalPage(id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 0, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#5A6373" }}>
          © 2026 RadarPrix — Scans propulsés par un algorithme maison sur données Google Shopping. RadarPrix n'est affilié à aucun marchand cité.
        </div>
      </div>
    </footer>
  );
}

/* ── App ────────────────────────────────────────────────────── */
/* ── Tableau de bord admin ─────────────────────────────────── */
function AdminDashboard({ token, onBack }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [s, u] = await Promise.all([apiAdminStats(token), apiAdminUsers(token)]);
      setStats(s);
      setUsers(u);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerScan = async () => {
    setScanning(true);
    setScanResult(null);
    setError(null);
    try {
      const res = await apiAdminTriggerScan(token, 10);
      setScanResult(res);
      await load(); // rafraîchit les stats après le scan
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const cardStyle = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: "18px 20px" };

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        ← Retour au site
      </button>
      <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: T.yellow }}>🛡️ Tableau de bord admin</h2>
      <p style={{ fontSize: 13, color: T.sub, marginBottom: 24 }}>Visible uniquement par toi.</p>

      {error && (
        <div style={{ background: "rgba(255,59,48,0.12)", border: `1.5px solid ${T.red}`, borderRadius: 10, padding: 12, fontSize: 14, color: T.ink, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!stats && !error && <div style={{ color: T.sub, fontSize: 14 }}>Chargement…</div>}

      {stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div style={cardStyle}>
              <div className="rp-display" style={{ fontSize: 28, fontWeight: 900, color: T.ink }}>{stats.totalUsers}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Utilisateurs inscrits</div>
            </div>
            <div style={cardStyle}>
              <div className="rp-display" style={{ fontSize: 28, fontWeight: 900, color: T.ink }}>{stats.totalScans}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Scans enregistrés</div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>Scan manuel</h3>
              <button
                onClick={triggerScan}
                disabled={scanning}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: scanning ? T.surface2 : T.ember, color: scanning ? T.sub : "#0C0E14", fontWeight: 800, fontSize: 12.5, cursor: scanning ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                {scanning ? "Scan en cours…" : "Lancer un scan (10 produits)"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
              Consomme du quota SerpApi à chaque clic — à utiliser avec modération, le cron tourne déjà en tâche de fond.
            </p>
            {scanResult && (
              <div style={{ marginTop: 10, fontSize: 12, color: T.green }}>
                ✓ {scanResult.scanned} produit(s) scanné(s) à l'instant.
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Produits les plus scannés</h3>
            {stats.topProducts.length === 0 && <p style={{ fontSize: 13, color: T.sub }}>Aucune donnée pour l'instant.</p>}
            {stats.topProducts.map((p) => (
              <div key={p.query} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
                <span style={{ color: T.ink, textTransform: "capitalize" }}>{p.query}</span>
                <span style={{ color: T.sub }}>{p.times_seen}×</span>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Utilisateurs ({users?.length || 0})</h3>
            {users?.map((u) => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar email={u.email} pseudo={u.pseudo} size={22} />
                  <span style={{ color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.pseudo || u.email}</span>
                  {u.role === "admin" && <span style={{ fontSize: 10, color: T.yellow }}>🛡️</span>}
                </div>
                <span style={{ color: T.sub, fontSize: 11, flexShrink: 0 }}>{u.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/* ── Favoris ────────────────────────────────────────────────── */
function FavorisView({ token, onBack, onOpenSearch }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiWatchlistGet(token).then(setItems).catch((e) => setError(e.message));
  }, [token]);

  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        ← Accueil
      </button>
      <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>⭐ Mes favoris</h2>
      {error && <p style={{ color: T.red, fontSize: 13 }}>{error}</p>}
      {items && items.length === 0 && <p style={{ color: T.sub, fontSize: 14 }}>Aucun favori pour l'instant — clique sur "★ Suivre" sur une page de résultats pour en ajouter.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items?.map((it) => (
          <button
            key={it.query}
            onClick={() => onOpenSearch(it.query)}
            style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", color: T.ink, fontFamily: "'Inter', sans-serif" }}
          >
            <div style={{ fontWeight: 800, fontSize: 14 }}>{it.query}</div>
            <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>Ajouté le {it.created_at?.slice(0, 10)}</div>
          </button>
        ))}
      </div>
    </main>
  );
}

/* ── Communauté : salon général + messages privés ──────────────── */
function CommunityView({ token, currentUserId, onBack }) {
  const [tab, setTab] = useState("public"); // public | dm
  const [publicMsgs, setPublicMsgs] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  const [conversations, setConversations] = useState(null);
  const [members, setMembers] = useState(null);
  const [activeConvo, setActiveConvo] = useState(null); // {id, display_name}
  const [dmMsgs, setDmMsgs] = useState([]);
  const [dmText, setDmText] = useState("");

  // Salon public : sondage régulier (toutes les 4s) pour un effet "live" sans websocket.
  useEffect(() => {
    let cancelled = false;
    let lastId = 0;
    const poll = async () => {
      try {
        const items = await apiGetPublicChat(lastId);
        if (cancelled || items.length === 0) return;
        lastId = items[items.length - 1].id;
        setPublicMsgs((prev) => [...prev, ...items]);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const sendPublic = async () => {
    if (!text.trim()) return;
    setError(null);
    try {
      await apiPostPublicChat(token, text.trim());
      setText("");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (tab !== "dm") return;
    apiGetConversations(token).then(setConversations).catch((e) => setError(e.message));
    apiGetMembers(token).then(setMembers).catch(() => {});
  }, [tab, token]);

  const openConvo = async (user) => {
    setActiveConvo(user);
    try {
      const msgs = await apiGetConversationWith(token, user.user_id ?? user.id);
      setDmMsgs(msgs);
    } catch (e) {
      setError(e.message);
    }
  };

  const sendDm = async () => {
    if (!dmText.trim() || !activeConvo) return;
    try {
      await apiPostMessageTo(token, activeConvo.user_id ?? activeConvo.id, dmText.trim());
      const msgs = await apiGetConversationWith(token, activeConvo.user_id ?? activeConvo.id);
      setDmMsgs(msgs);
      setDmText("");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        ← Accueil
      </button>
      <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>👥 Communauté</h2>

      <div style={{ display: "flex", background: T.surface2, borderRadius: 10, padding: 4, marginBottom: 16 }}>
        <button onClick={() => setTab("public")} style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", background: tab === "public" ? T.ember : "transparent", color: tab === "public" ? "#0C0E14" : T.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          💬 Salon général
        </button>
        <button onClick={() => setTab("dm")} style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", background: tab === "dm" ? T.ember : "transparent", color: tab === "dm" ? "#0C0E14" : T.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          ✉️ Messages privés
        </button>
      </div>

      {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {tab === "public" && (
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", marginBottom: 12 }}>
            {publicMsgs.length === 0 && <p style={{ color: T.sub, fontSize: 13 }}>Aucun message pour l'instant — lance la discussion.</p>}
            {publicMsgs.map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 8 }}>
                <Avatar email={m.author} avatarUrl={m.avatar_url} size={26} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12 }}>
                    <strong style={{ color: m.user_id === currentUserId ? T.emberSolid : T.ink }}>{m.author}</strong>{" "}
                    <span style={{ color: T.sub, fontSize: 10.5 }}>{m.created_at?.slice(11, 16)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: T.ink }}>{m.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendPublic()}
              maxLength={500}
              placeholder="Écris un message au salon…"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif" }}
            />
            <button onClick={sendPublic} style={{ padding: "0 16px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Envoyer
            </button>
          </div>
        </div>
      )}

      {tab === "dm" && !activeConvo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {conversations?.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, color: T.sub, marginBottom: 8, fontWeight: 700 }}>Conversations en cours</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {conversations.map((c) => (
                  <button key={c.user_id} onClick={() => openConvo(c)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                    <Avatar email={c.display_name} avatarUrl={c.avatar_url} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: T.ink }}>{c.display_name}</div>
                      <div style={{ fontSize: 12, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_body}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 style={{ fontSize: 13, color: T.sub, marginBottom: 8, fontWeight: 700 }}>Démarrer une conversation</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members?.map((m) => (
                <button key={m.id} onClick={() => openConvo(m)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                  <Avatar email={m.display_name} avatarUrl={m.avatar_url} size={30} />
                  <div style={{ fontWeight: 800, fontSize: 13, color: T.ink }}>{m.display_name}</div>
                </button>
              ))}
              {members?.length === 0 && <p style={{ color: T.sub, fontSize: 13 }}>Aucun autre membre inscrit pour l'instant.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "dm" && activeConvo && (
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 }}>
          <button onClick={() => setActiveConvo(null)} style={{ background: "none", border: "none", color: T.sub, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "'Inter', sans-serif" }}>
            ← Toutes les conversations
          </button>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.ink, marginBottom: 10 }}>{activeConvo.display_name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
            {dmMsgs.map((m) => (
              <div key={m.id} style={{ alignSelf: m.from_user_id === currentUserId ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                <div style={{ background: m.from_user_id === currentUserId ? T.ember : T.surface2, color: m.from_user_id === currentUserId ? "#0C0E14" : T.ink, padding: "8px 12px", borderRadius: 10, fontSize: 13.5 }}>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendDm()}
              maxLength={500}
              placeholder="Ton message…"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif" }}
            />
            <button onClick={sendDm} style={{ padding: "0 16px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


export default function RadarPrixSite() {
  const [view, setView] = useState("home");
  const [legalPage, setLegalPage] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null); // { id, email, role, pseudo, avatar_url }
  const [followMsg, setFollowMsg] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("radarprix_token");
    const u = localStorage.getItem("radarprix_user");
    if (t && u) {
      setAuthToken(t);
      try {
        setAuthUser(JSON.parse(u));
      } catch {}
    }
  }, []);

  const persistUser = (user) => {
    setAuthUser(user);
    localStorage.setItem("radarprix_user", JSON.stringify(user));
  };

  const logout = () => {
    localStorage.removeItem("radarprix_token");
    localStorage.removeItem("radarprix_user");
    localStorage.removeItem("radarprix_email"); // nettoyage des anciennes clés
    localStorage.removeItem("radarprix_role");
    setAuthToken(null);
    setAuthUser(null);
    setProfileMenuOpen(false);
  };

  const authRole = authUser?.role || null;

  const followCurrentSearch = async () => {
    if (!authToken) {
      setAuthOpen(true);
      return;
    }
    const followQuery = searchTerm || `Catégorie : ${CATEGORIES.find((c) => c.id === category)?.label || category}`;
    try {
      await apiWatchlistAdd(authToken, followQuery, category);
      setFollowMsg("✓ Ajouté à tes favoris");
      setTimeout(() => setFollowMsg(null), 2500);
    } catch (e) {
      setFollowMsg("Erreur : " + e.message);
      setTimeout(() => setFollowMsg(null), 3000);
    }
  };

  const [tab, setTab] = useState("deals"); // deals | erreurs
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("tout");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [maxPrice, setMaxPrice] = useState("");
  const [scannedQuery, setScannedQuery] = useState(null);
  const [totalDeals, setTotalDeals] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    document.title = "RadarPrix — Le détecteur d'erreurs de prix";
  }, []);

  // Onglets "Gros deals" / "Erreurs de prix" : lecture instantanée du pool
  // de deals déjà repérés en base par le cron — pas de scan à la volée,
  // pas de limite arbitraire, juste de la pagination.
  const openTab = async (newTab, opts = {}) => {
    const catId = opts.category !== undefined ? opts.category : category;
    setTab(newTab);
    setSearchTerm("");
    setVerdictFilter(newTab === "erreurs" ? "erreur" : "all");
    setView("results");
    window.scrollTo(0, 0);
    setLoading(true);
    setError(null);
    setItems(null);
    setPage(1);
    try {
      const data = await fetchDeals(catId, 1, PAGE_SIZE);
      setItems(data.items);
      setTotalDeals(data.total);
      setHasMore(data.hasMore);
      setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les deals : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreDeals = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const data = await fetchDeals(category, nextPage, PAGE_SIZE);
      setItems([...(items || []), ...data.items]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (e) {
      setError("Impossible de charger la suite : " + e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Recherche libre (barre de recherche) : ici, un vrai scan SerpApi en
  // direct sur le produit précis demandé — action explicite de l'utilisateur.
  const searchProduct = async (term) => {
    setTab("deals");
    setSearchTerm(term);
    setVerdictFilter("all");
    setView("results");
    window.scrollTo(0, 0);
    setLoading(true);
    setError(null);
    setItems(null);
    setScannedQuery(null);
    try {
      const { items: found, scannedQuery: sq } = await scanBackend(term, "tout");
      setItems(found);
      setScannedQuery(sq);
      setHasMore(false);
      setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error(e);
      setError("Le scan a échoué : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const visible = (items || [])
    .filter((it) => {
      if (verdictFilter !== "all" && it.verdict !== verdictFilter) return false;
      if (maxPrice && Number(it.price) > Number(maxPrice)) return false;
      return true;
    })
    .sort((a, b) => (sortBy === "prix" ? Number(a.price) - Number(b.price) : b.score - a.score));

  const goHome = () => {
    setView("home");
    window.scrollTo(0, 0);
  };

  return (
    <div className="rp-body" onClick={() => profileMenuOpen && setProfileMenuOpen(false)} style={{ background: T.bg, color: T.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GlobalStyles />

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(12,14,20,0.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>
            <button onClick={goHome} className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
            </button>
            {view === "results" && (
              <div style={{ flex: 1, maxWidth: 340, marginLeft: 14 }}>
                <SearchBar onSearch={(t) => searchProduct(t)} />
              </div>
            )}
            {authToken && authUser ? (
              <div style={{ position: "relative", marginLeft: 12 }}>
                <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  aria-label="Menu du profil"
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1.5px solid ${authRole === "admin" ? T.yellow : T.line}`, borderRadius: 20, padding: "4px 10px 4px 4px", cursor: "pointer" }}
                >
                  <Avatar email={authUser.email} pseudo={authUser.pseudo} avatarUrl={authUser.avatar_url} size={26} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: authRole === "admin" ? T.yellow : T.sub, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {authUser.pseudo || authUser.email}
                  </span>
                </button>
                {profileMenuOpen && (
                  <ProfileMenu
                    user={authUser}
                    role={authRole}
                    onOpenSettings={() => { setSettingsOpen(true); setProfileMenuOpen(false); }}
                    onLogout={logout}
                    onOpenAdmin={() => { setView("admin"); setProfileMenuOpen(false); }}
                  />
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                style={{ marginLeft: 12, background: "none", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "6px 12px", color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" }}
              >
                Connexion
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 2 }}>
            <button className={`rp-tab ${view === "results" && tab === "deals" ? "active" : ""}`} onClick={() => openTab("deals")}>
              🔥 Gros deals
            </button>
            <button className={`rp-tab ${view === "results" && tab === "erreurs" ? "active" : ""}`} onClick={() => openTab("erreurs")}>
              🔴 Erreurs de prix
            </button>
            <button className={`rp-tab ${view === "favoris" ? "active" : ""}`} onClick={() => (authToken ? setView("favoris") : setAuthOpen(true))}>
              ⭐ Favoris
            </button>
            <button className={`rp-tab ${view === "communaute" ? "active" : ""}`} onClick={() => (authToken ? setView("communaute") : setAuthOpen(true))}>
              👥 Communauté
            </button>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1 }}>
        {view === "home" && (
          <>
            <header style={{ maxWidth: 960, margin: "0 auto", padding: "54px 18px 20px", textAlign: "center", position: "relative" }}>
              <div aria-hidden="true" style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(255,106,53,0.14), transparent 65%)", pointerEvents: "none" }} />
              <h1 className="rp-display" style={{ fontSize: "clamp(24px, 6vw, 42px)", fontWeight: 900, lineHeight: 1.15 }}>
                Quand le marchand se trompe,
                <br />
                <span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>vous gagnez.</span>
              </h1>
              <p style={{ maxWidth: 500, margin: "16px auto 26px", color: T.sub, fontSize: 15, lineHeight: 1.6 }}>
                Erreurs de prix et très gros deals, détectés par un algorithme qui compare en continu les prix réels des marchands français.
              </p>

              <div style={{ maxWidth: 520, margin: "0 auto" }}>
                <SearchBar big onSearch={(t) => searchProduct(t)} placeholder="Cherchez un produit : PS5, aspirateur, iPhone…" />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
                {[["deals", "🔥 Gros deals"], ["erreurs", "🔴 Erreurs de prix"]].map(([m, label]) => (
                  <button key={m} onClick={() => openTab(m)} style={{ padding: "12px 18px", borderRadius: 12, border: `1.5px solid ${T.line}`, background: T.surface, color: T.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {label}
                  </button>
                ))}
              </div>

              <div aria-hidden="true" style={{ margin: "38px auto 0", width: "fit-content", background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: 16, padding: "18px 30px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
                <div style={{ fontSize: 12, color: T.sub, fontWeight: 700, marginBottom: 6, textAlign: "left" }}>Casque gaming sans fil</div>
                <div style={{ overflow: "hidden", height: 44 }}>
                  <div style={{ animation: "priceGlitch 4s ease-in-out infinite" }}>
                    <div className="rp-display" style={{ fontSize: 34, fontWeight: 900, height: 44, textDecoration: "line-through", textDecorationColor: T.red, color: T.sub }}>449,00 €</div>
                    <div className="rp-display" style={{ fontSize: 34, fontWeight: 900, height: 44, color: T.emberSolid }}>44,90 €</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: T.green, fontWeight: 800, textAlign: "left", marginTop: 4 }}>
                  ● Écart détecté vs prix de référence — c'est ça, une erreur de prix
                </div>
              </div>
            </header>

            <section style={{ background: T.surface, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, marginTop: 40 }}>
              <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 18px" }}>
                <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 32 }}>Comment ça marche</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 22 }}>
                  {[
                    { icon: "📡", title: "Le scan interroge Google Shopping en direct", text: "Une recherche réelle sur les prix actuels, tous marchands confondus (Amazon, Cdiscount, Fnac, LDLC...), à l'instant où vous cliquez." },
                    { icon: "🧮", title: "Un algorithme compare au prix de référence", text: "Chaque offre est confrontée à la médiane des vendeurs et à l'historique de prix déjà observé pour ce produit. Aucune IA n'intervient dans ce calcul." },
                    { icon: "💎", title: "Un score Pépite trie le meilleur", text: "Écart de prix, cohérence, fiabilité du marchand : chaque offre reçoit un score sur 100. À 85 et plus, c'est une pépite." },
                  ].map((s) => (
                    <div key={s.title} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 16, padding: "22px 20px" }}>
                      <div style={{ fontSize: 30, marginBottom: 12 }}>{s.icon}</div>
                      <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 8, color: T.ink }}>{s.title}</h3>
                      <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.6 }}>{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ maxWidth: 680, margin: "0 auto", padding: "48px 18px 10px" }}>
              <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 20 }}>Questions fréquentes</h2>
              {[
                { q: "Une « erreur de prix », c'est quoi exactement ?", a: "Un prix affiché par erreur par le marchand : virgule décalée (449 € qui devient 44,90 €), mauvaise référence, remise mal paramétrée. Ces offres durent souvent quelques heures avant correction." },
                { q: "Suis-je sûr de recevoir le produit si je commande ?", a: "Non, et c'est important : en droit français, un vendeur peut annuler une commande en cas d'erreur manifeste sur le prix. Plus l'erreur est énorme, plus l'annulation est probable. C'est une loterie — parfois ça passe, surtout si le colis est expédié rapidement." },
                { q: "Comment le prix de référence est-il calculé ?", a: "Notre algorithme compare chaque offre à la médiane des autres vendeurs pour le même produit, et à l'historique de prix déjà enregistré. Plus l'historique est riche, plus la référence est précise." },
                { q: "Les offres affichées sont-elles garanties exactes ?", a: "Non. Les prix bougent en permanence et l'algorithme peut se tromper, notamment si un vendeur liste un produit différent sous un titre trompeur. Considérez chaque résultat comme une piste à vérifier immédiatement sur le site marchand." },
                { q: "RadarPrix touche-t-il une commission sur mes achats ?", a: "Non. Les liens pointent directement vers les fiches produit trouvées lors du scan, sans tracking d'affiliation." },
              ].map((f) => (
                <details key={f.q} className="rp-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>

            <section style={{ maxWidth: 680, margin: "0 auto", padding: "24px 18px 0" }}>
              <div style={{ background: "rgba(255,197,61,0.08)", border: `1px solid ${T.yellow}`, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                ⚠️ <strong>Transparence :</strong> RadarPrix est un outil d'information. Les offres sont détectées automatiquement et peuvent être inexactes, expirées ou annulées par le vendeur. Vérifiez toujours l'offre et le vendeur avant d'acheter.
              </div>
            </section>
          </>
        )}

        {view === "results" && (
          <main style={{ maxWidth: 620, margin: "0 auto", padding: "22px 16px 40px" }}>
            <button onClick={goHome} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
              ← Accueil
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
              <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900 }}>
                {searchTerm ? `🔎 « ${searchTerm} »` : tab === "erreurs" ? "🔴 Erreurs de prix" : "🔥 Gros deals"}
              </h2>
              <button
                onClick={followCurrentSearch}
                style={{ flexShrink: 0, background: "none", border: `1.5px solid ${T.emberSolid}`, borderRadius: 8, padding: "7px 12px", color: T.ink, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                ★ Suivre
              </button>
            </div>
            {followMsg && <p style={{ fontSize: 12, color: T.green, marginBottom: 6 }}>{followMsg}</p>}
            {lastScan && !loading && (
              <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>
                {searchTerm
                  ? `Scan de ${lastScan} · ${visible.length}/${items ? items.length : 0} offre(s) affichée(s)`
                  : `${totalDeals} deal(s) au total dans cette catégorie · ${visible.length}/${items ? items.length : 0} chargée(s) et affichée(s)`}
              </p>
            )}

            {!searchTerm && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, marginTop: 8 }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Catégorie de produits"
                  style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => openTab(tab)}
                  disabled={loading}
                  style={{ padding: "0 18px", borderRadius: 10, border: "none", background: loading ? T.surface2 : T.ember, color: loading ? T.sub : "#0C0E14", fontWeight: 900, fontSize: 13, cursor: loading ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  Relancer
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <FilterChip active={verdictFilter === "all"} onClick={() => setVerdictFilter("all")}>Tout</FilterChip>
                <FilterChip active={verdictFilter === "erreur"} onClick={() => setVerdictFilter("erreur")}>🔴 Erreurs</FilterChip>
                <FilterChip active={verdictFilter === "deal"} onClick={() => setVerdictFilter("deal")}>🟡 Deals</FilterChip>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 700 }}>Trier :</span>
                <FilterChip active={sortBy === "score"} onClick={() => setSortBy("score")}>💎 Meilleur score</FilterChip>
                <FilterChip active={sortBy === "prix"} onClick={() => setSortBy("prix")}>Prix croissant</FilterChip>
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Prix max €"
                  inputMode="numeric"
                  aria-label="Prix maximum en euros"
                  style={{ width: 90, padding: "8px 10px", borderRadius: 20, border: `1.5px solid ${T.line}`, fontSize: 12, background: T.surface2, color: T.ink, fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {loading && (
                <div style={{ textAlign: "center", color: T.sub, fontSize: 14, padding: 40 }}>
                  <span aria-hidden="true" style={{ display: "inline-block", width: 22, height: 22, border: `3px solid ${T.line}`, borderTopColor: T.emberSolid, borderRadius: "50%", animation: "sweep 0.9s linear infinite", marginBottom: 12 }} />
                  <div>Interrogation des marchands en cours…</div>
                </div>
              )}
              {error && (
                <div style={{ background: "rgba(255,59,48,0.12)", border: `1.5px solid ${T.red}`, borderRadius: 10, padding: 12, fontSize: 14, color: T.ink }}>
                  {error}
                </div>
              )}
              {items && visible.length === 0 && !loading && (
                <div style={{ textAlign: "center", color: T.sub, fontSize: 14, padding: 26 }}>
                  {items.length > 0
                    ? `${items.length} offre(s) trouvée(s) mais masquée(s) par vos filtres — élargissez-les.`
                    : "Aucune anomalie de prix détectée à l'instant pour cette recherche. Essayez une autre catégorie ou revenez plus tard."}
                </div>
              )}
              {visible.map((it, i) => (
                <Sticker key={i} item={it} authToken={authToken} onNeedAuth={() => setAuthOpen(true)} />
              ))}
              {items && items.length > 0 && !loading && !searchTerm && hasMore && (
                <button
                  onClick={loadMoreDeals}
                  disabled={loadingMore}
                  style={{ padding: "13px", borderRadius: 10, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: loadingMore ? T.sub : T.ink, fontWeight: 800, fontSize: 13.5, cursor: loadingMore ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  {loadingMore ? "Chargement…" : `Voir plus (${totalDeals - visible.length} restant(s))`}
                </button>
              )}
              {items && items.length > 0 && !loading && searchTerm && (
                <button
                  onClick={() => searchProduct(searchTerm)}
                  style={{ padding: "13px", borderRadius: 10, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  🔄 Relancer ce scan (nouveaux prix)
                </button>
              )}
              {items && !loading && (
                <div style={{ textAlign: "center", color: T.sub, fontSize: 12 }}>
                  Vérifiez toujours l'offre et le vendeur avant d'acheter
                </div>
              )}
            </div>
          </main>
        )}

        {view === "admin" && authRole === "admin" && (
          <AdminDashboard token={authToken} onBack={goHome} />
        )}

        {view === "favoris" && authToken && (
          <FavorisView
            token={authToken}
            onBack={goHome}
            onOpenSearch={(q) => searchProduct(q)}
          />
        )}

        {view === "communaute" && authToken && (
          <CommunityView token={authToken} currentUserId={authUser?.id} onBack={goHome} />
        )}
      </div>

      <Footer setLegalPage={setLegalPage} />
      <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={(token, user) => {
            setAuthToken(token);
            localStorage.setItem("radarprix_token", token);
            persistUser(user);
            setAuthOpen(false);
          }}
        />
      )}
      {settingsOpen && authUser && (
        <SettingsModal
          user={authUser}
          token={authToken}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(u) => persistUser(u)}
          onAccountDeleted={() => {
            setSettingsOpen(false);
            logout();
            goHome();
          }}
        />
      )}
    </div>
  );
}
