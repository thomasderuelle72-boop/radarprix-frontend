import { useState, useEffect } from "react";
import { T, CATEGORIES } from "./theme.js";
import DealCard, { SkeletonCard } from "./components/DealCard.jsx";
import MobileNav from "./components/MobileNav.jsx";
import ProductDetailView from "./components/ProductDetailView.jsx";
import Avatar from "./components/Avatar.jsx";
import Reveal from "./components/Reveal.jsx";

/* ════════════════════════════════════════════════════════════════
   RADARPRIX v4 — branché sur le vrai backend (Railway + SerpApi).
   Plus aucun appel à l'API Claude : les scans interrogent Google
   Shopping via ton propre serveur, et l'algorithme de détection
   tourne côté serveur (src/algorithm.js), en pur code.
   ════════════════════════════════════════════════════════════════ */

import {
  fetchDeals,
  scanBackend,
  apiGetLatest,
  apiAuth,
  apiWatchlistAdd,
  apiWatchlistGet,
  apiUpdateProfile,
  apiChangePassword,
  apiDeleteAccount,
  apiAdminStats,
  apiAdminUsers,
  apiAdminTriggerScan,
  apiGetPublicChat,
  apiPostPublicChat,
  apiGetMembers,
  apiGetConversations,
  apiGetConversationWith,
  apiPostMessageTo,
  apiCommunityListDeals,
  apiCommunitySubmitDeal,
  apiCommunityVote,
  apiCommunityRemoveVote,
  apiForumCategories,
  apiForumThreads,
  apiForumCreateThread,
  apiForumThread,
  apiForumReply,
} from "./api.js";

// Toutes les vues liées au menu "Communauté", utilisées pour surligner l'onglet dans la nav.
const COMMUNITY_VIEWS = ["communaute-picks", "communaute-chat", "communaute-forum", "communaute-forum-thread"];

/* ── Styles globaux ─────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Inter:wght@400;600;800&display=swap');
    * { box-sizing: border-box; margin: 0; }
    body { background: ${T.bg}; }
    img, svg { max-width: 100%; }
    .rp-display { font-family: 'Unbounded', system-ui, sans-serif; }
    .rp-body { font-family: 'Inter', system-ui, sans-serif; }
    @keyframes priceGlitch {
      0%, 38% { transform: translateY(0); }
      45%, 88% { transform: translateY(-100%); }
      95%, 100% { transform: translateY(0); }
    }
    @keyframes sweep { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp 280ms cubic-bezier(.2,.8,.2,1) both; }
    /* CTA principal : léger décollé + montée de luminosité au survol */
    .rp-cta { transition: transform 160ms cubic-bezier(.2,.8,.2,1), filter 160ms cubic-bezier(.2,.8,.2,1); }
    .rp-cta:hover { transform: translateY(-1px) scale(1.01); filter: brightness(1.04); }
    /* Petit point vert pulsant pour signaler une donnée vérifiée récemment */
    .rp-fresh-dot { width: 6px; height: 6px; border-radius: 50%; background: ${T.green}; box-shadow: 0 0 8px rgba(53,212,117,.5); position: relative; display: inline-block; flex-shrink: 0; }
    .rp-fresh-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 999px; background: rgba(53,212,117,.2); animation: rpPulse 1.8s infinite; }
    @keyframes rpPulse { 0% { transform: scale(.8); opacity: .8; } 70%, 100% { transform: scale(1.8); opacity: 0; } }
    /* Ouverture des modales : fondu + léger zoom */
    .rp-modal-in { animation: rpModalIn 320ms cubic-bezier(.2,.8,.2,1) both; }
    @keyframes rpModalIn { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: scale(1); } }
    /* Balayage radar discret, uniquement décoratif derrière le hero */
    @keyframes rpSweep { to { transform: rotate(360deg); } }
    .rp-radar-sweep { animation: rpSweep 2700ms linear infinite; }
    /* Badge "tamponné" : léger effet de rebond façon tampon de caisse */
    @keyframes stampIn {
      0% { transform: scale(1.6) rotate(-14deg); opacity: 0; }
      60% { transform: scale(0.95) rotate(-2deg); opacity: 1; }
      100% { transform: scale(1) rotate(-4deg); opacity: 1; }
    }
    .stamp-badge { animation: stampIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; transform-origin: center; }
    /* Toast de confirmation (ex: "Ajouté aux favoris") */
    @keyframes toastIn {
      0% { transform: translateY(-6px) scale(0.9); opacity: 0; }
      60% { transform: translateY(1px) scale(1.03); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .toast-in { animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    /* Message de chat qui glisse à l'arrivée */
    @keyframes msgSlideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
    .msg-slide-in { animation: msgSlideIn 0.3s ease both; }
    /* Retour tactile immédiat sur les boutons d'action */
    .rp-pressable { transition: transform 0.1s ease; }
    .rp-pressable:active { transform: scale(0.96); }
    /* Apparition en fondu au défilement (piloté par IntersectionObserver, voir Reveal.jsx) */
    .reveal-on-scroll { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
    .reveal-on-scroll.revealed { opacity: 1; transform: translateY(0); }
    @keyframes rpShimmer { 0% { background-position: -300% 0; } 100% { background-position: 300% 0; } }
    .rp-shimmer { background: linear-gradient(90deg, ${T.surface2} 22%, ${T.line} 42%, ${T.surface2} 62%); background-size: 500% 100%; animation: rpShimmer 1.7s ease-in-out infinite; }
    .rp-ticket-sep {
      height: 1px; border: none; margin: 2px 0;
      background-image: repeating-linear-gradient(90deg, ${T.line} 0 7px, transparent 7px 14px);
    }
    .rp-barcode {
      height: 30px;
      background-image: repeating-linear-gradient(90deg, ${T.ink} 0 2px, transparent 2px 3px, ${T.ink} 3px 4px, transparent 4px 7px, ${T.ink} 7px 9px, transparent 9px 10px);
      opacity: 0.82;
    }
    /* Encoches façon coupon/ticket : demi-cercles "découpés" dans les bords
       gauche/droit de la carte, couleur du fond de page pour l'effet de trou. */
    .rp-ticket { position: relative; }
    .rp-ticket::before, .rp-ticket::after {
      content: '';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${T.bg};
      z-index: 2;
    }
    .rp-ticket::before { left: -9px; }
    .rp-ticket::after { right: -9px; }
    /* Bandeau diagonal "alerte", réservé aux cartes ERREUR — même famille
       de technique que .rp-barcode (repeating-linear-gradient). */
    .rp-zigzag {
      height: 5px;
      border-radius: 3px;
      background-image: repeating-linear-gradient(-45deg, ${T.red} 0 6px, ${T.pink} 6px 12px);
      opacity: 0.9;
    }
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
    .rp-tab { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: ${T.sub}; font-weight: 800; font-size: 13px; cursor: pointer; padding: 8px 13px; border-radius: 9px; font-family: 'Inter', system-ui, sans-serif; white-space: nowrap; transition: background .15s ease, color .15s ease; }
    .rp-tab:hover { color: ${T.ink}; background: rgba(255,106,53,0.1); }
    .rp-tab.active { color: #0C0E14; background: ${T.ember}; box-shadow: 0 2px 10px rgba(255,106,53,0.35); }
    .rp-dropdown-wrap { position: relative; }
    .rp-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: ${T.surface}; border: 1px solid ${T.line}; border-radius: 12px; padding: 6px; min-width: 220px; box-shadow: 0 16px 32px rgba(0,0,0,0.5); z-index: 60; animation: fadeUp .15s ease both; }
    .rp-dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: none; border: none; color: ${T.ink}; font-weight: 700; font-size: 13px; padding: 10px 11px; border-radius: 8px; cursor: pointer; font-family: 'Inter', system-ui, sans-serif; }
    .rp-dropdown-item:hover { background: ${T.surface2}; color: ${T.emberSolid}; }
    .rp-dropdown-item .rp-dropdown-desc { display: block; font-weight: 500; font-size: 11px; color: ${T.sub}; margin-top: 1px; }
    html, body { overflow-x: hidden; max-width: 100vw; }
    .rp-mobile-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 55;
      background: rgba(12,14,20,0.96);
      backdrop-filter: blur(10px);
      border-top: 1px solid ${T.line};
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    @media (max-width: 640px) {
      .rp-mobile-nav { display: flex; }
      .rp-body { padding-bottom: 60px; }
    }
    @media (max-width: 760px) {
      .rp-footer-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @media (max-width: 460px) {
      .rp-footer-grid { grid-template-columns: 1fr !important; }
    }
    .rp-deal-card { transition: transform 160ms cubic-bezier(.2,.8,.2,1), border-color 160ms cubic-bezier(.2,.8,.2,1), box-shadow 160ms cubic-bezier(.2,.8,.2,1); }
    .rp-deal-card:hover { transform: translateY(-4px); border-color: ${T.emberSolid}; box-shadow: ${T.shadowCardHover}; }
    .rp-mobile-nav button { transition: color .15s ease; }
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
        className="rp-cta"
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
        {big ? "Rechercher" : "🔎"}
      </button>
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
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="rp-modal-in" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "26px 22px", maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="rp-display" style={{ fontSize: 17, color: T.ink }}>{mode === "login" ? "Connexion" : "Créer un compte"}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>×</button>
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
      <div onClick={(e) => e.stopPropagation()} className="rp-modal-in" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${T.line}` }}>
          <h3 className="rp-display" style={{ fontSize: 16, color: T.ink }}>⚙️ Paramètres</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 4, padding: "14px 12px", borderBottom: `1px solid ${T.line}`, width: "100%", overflowX: "auto" }}>
            <button onClick={() => setTab("compte")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "compte" ? T.surface2 : "transparent", color: tab === "compte" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
              👤 Compte général
            </button>
            <button onClick={() => setTab("securite")} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === "securite" ? T.surface2 : "transparent", color: tab === "securite" ? T.ink : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
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

/* ── Section "Pépites du moment" de la homepage, alimentée par /api/deals ── */
function HomeDealsSection({ authToken, onNeedAuth, onSeeAll, onOpenDetail }) {
  const [items, setItems] = useState(undefined); // undefined = chargement, null = erreur
  const pageSize = 4;

  useEffect(() => {
    let cancelled = false;
    // On sur-échantillonne (15) puis on filtre les erreurs de prix côté client : la
    // section "Pépites du moment" ne doit montrer que des deals normaux — les erreurs
    // ont leur propre section juste en dessous, comme dans la maquette (pas de doublon).
    fetchDeals("tout", 1, 15)
      .then((data) => { if (!cancelled) setItems((data.items || []).filter((it) => it.verdict !== "erreur").slice(0, pageSize)); })
      .catch(() => { if (!cancelled) setItems(null); });
    return () => { cancelled = true; };
  }, []);

  if (items === null) return null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 18px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900 }}>🔥 Pépites du moment</h2>
        {items && items.length > 0 && (
          <button
            onClick={onSeeAll}
            style={{ background: "none", border: "none", color: T.emberSolid, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Voir tous les deals →
          </button>
        )}
      </div>
      {items === undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={`home-skel-${i}`} />)}
        </div>
      )}
      {items && items.length === 0 && (
        <div style={{ textAlign: "center", color: T.sub, fontSize: 13, padding: 20 }}>
          Aucune pépite détectée à l'instant — le scan tourne en tâche de fond, revenez bientôt.
        </div>
      )}
      {items && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {items.map((it, i) => (
            <DealCard key={i} item={it} index={i} authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Section "Erreurs de prix détectées" de la homepage — même source que
   HomeDealsSection (/api/deals), filtrée côté client sur verdict "erreur". ── */
function HomeErrorsSection({ authToken, onNeedAuth, onSeeAll, onOpenDetail }) {
  const [items, setItems] = useState(undefined); // undefined = chargement, null = erreur

  useEffect(() => {
    let cancelled = false;
    fetchDeals("tout", 1, 15)
      .then((data) => {
        if (cancelled) return;
        setItems((data.items || []).filter((it) => it.verdict === "erreur").slice(0, 3));
      })
      .catch(() => { if (!cancelled) setItems(null); });
    return () => { cancelled = true; };
  }, []);

  if (items === null || items?.length === 0) return null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 18px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900 }}>🔴 Erreurs de prix détectées</h2>
        {items && items.length > 0 && (
          <button
            onClick={onSeeAll}
            style={{ background: "none", border: "none", color: T.red, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Voir toutes les erreurs →
          </button>
        )}
      </div>
      {items === undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[0, 1].map((i) => <SkeletonCard key={`err-skel-${i}`} />)}
        </div>
      )}
      {items && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {items.map((it, i) => (
            <DealCard key={i} item={it} index={i} variant="price-error" authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Bandeau de statistiques réelles — calculées à partir de /api/deals
   (route publique existante), pas d'une route de stats dédiée qui
   n'existe pas encore. Pas de framing "aujourd'hui" : on ne connaît pas
   la date de détection ligne à ligne, donc on affiche des totaux vrais
   plutôt que des chiffres quotidiens inventés. ── */
function HomeStatsBar() {
  const [stats, setStats] = useState(undefined); // undefined = chargement, null = indisponible

  useEffect(() => {
    let cancelled = false;
    fetchDeals("tout", 1, 50)
      .then((data) => {
        if (cancelled) return;
        const items = data.items || [];
        const sellers = new Set(items.map((it) => it.seller).filter(Boolean));
        const errors = items.filter((it) => it.verdict === "erreur").length;
        setStats({ total: data.total, sellers: sellers.size, errors });
      })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, []);

  if (stats === null) return null;

  const tiles = [
    { icon: "📡", label: "Deals actifs détectés", value: stats?.total, iconBg: "#1A1330", iconColor: T.purple },
    { icon: "🏬", label: "Marchands identifiés", value: stats?.sellers, iconBg: "#2E2318", iconColor: T.yellow },
    { icon: "🔴", label: "Erreurs de prix en cours", value: stats?.errors, iconBg: "#2C1420", iconColor: T.pink },
  ];

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 18px" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 18px", flex: "1 1 220px", maxWidth: 280 }}>
            <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, background: t.iconBg, fontSize: 18, flexShrink: 0 }}>
              {t.icon}
            </span>
            <div>
              <div className="rp-display" style={{ fontSize: 19, fontWeight: 900, color: T.ink, minHeight: 23 }}>
                {stats === undefined ? <span className="rp-shimmer" style={{ display: "inline-block", width: 40, height: 16, borderRadius: 4 }} /> : t.value}
              </div>
              <div style={{ fontSize: 11, color: T.sub }}>{t.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
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
      <div onClick={(e) => e.stopPropagation()} className="rp-modal-in" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "26px 22px", maxWidth: 560, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="rp-display" style={{ fontSize: 17, color: T.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>×</button>
        </div>
        <p style={{ whiteSpace: "pre-line", fontSize: 13.5, lineHeight: 1.7, color: T.sub }}>{body}</p>
      </div>
    </div>
  );
}

function FooterLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "block", background: "none", border: "none", color: T.sub, cursor: "pointer", padding: "3px 0", fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: "left" }}>
      {children}
    </button>
  );
}

function Footer({ setLegalPage, goHome, openTab, goToCommunity, authToken, onNeedAuth, onOpenFavoris }) {
  const [newsletterNote, setNewsletterNote] = useState(false);
  return (
    <footer style={{ background: "#080A0F", borderTop: `1px solid ${T.line}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 18px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.3fr", gap: 24 }} className="rp-footer-grid">
          <div>
            <div className="rp-display" style={{ color: T.ink, fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
              RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
            </div>
            <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginBottom: 14, maxWidth: 240 }}>
              RadarPrix détecte automatiquement les meilleurs deals et les erreurs de prix chez les marchands français.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {["🐦", "🎮", "📷", "✉️"].map((ic, i) => (
                <span key={i} aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: T.surface2, fontSize: 13 }}>
                  {ic}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Navigation</h4>
            <FooterLink onClick={() => openTab("deals")}>Gros deals</FooterLink>
            <FooterLink onClick={() => openTab("erreurs")}>Erreurs de prix</FooterLink>
            <FooterLink onClick={() => (authToken ? onOpenFavoris() : onNeedAuth())}>Favoris</FooterLink>
            <FooterLink onClick={() => goToCommunity("communaute-picks")}>Communauté</FooterLink>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Légal</h4>
            <FooterLink onClick={() => setLegalPage("mentions")}>Mentions légales</FooterLink>
            <FooterLink onClick={() => setLegalPage("cgu")}>CGU</FooterLink>
            <FooterLink onClick={() => setLegalPage("confidentialite")}>Politique de confidentialité</FooterLink>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>À propos</h4>
            <FooterLink onClick={() => { goHome(); window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: "smooth" }); }}>Comment ça marche ?</FooterLink>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>Restez dans le radar</h4>
            <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginBottom: 10 }}>
              Recevez les meilleurs deals et erreurs de prix directement par email.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); setNewsletterNote(true); }}
              style={{ display: "flex", gap: 6 }}
            >
              <input
                type="email"
                required
                placeholder="Votre email"
                style={{ flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}
              />
              <button type="submit" aria-label="S'inscrire" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
                ➤
              </button>
            </form>
            {newsletterNote && <p style={{ fontSize: 11, color: T.sub, marginTop: 8 }}>Bientôt disponible — cette fonctionnalité n'est pas encore branchée.</p>}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 28, paddingTop: 18, fontSize: 12, color: "#5A6373", textAlign: "center" }}>
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
// Une ligne de favori : relit le dernier scan enregistré pour cette requête
// suivie (route existante /api/latest, pas de nouvelle route backend) pour
// afficher le vrai prix/score courant, plutôt que juste le nom recherché.
function FavoriteCard({ query, addedAt, authToken, onNeedAuth, onOpenDetail, onOpenSearch }) {
  const [offers, setOffers] = useState(undefined); // undefined = chargement, null = erreur

  useEffect(() => {
    let cancelled = false;
    apiGetLatest(query)
      .then((items) => !cancelled && setOffers(items))
      .catch(() => !cancelled && setOffers(null));
    return () => { cancelled = true; };
  }, [query]);

  if (offers === undefined) return <SkeletonCard />;

  // Aucune anomalie de prix en cours pour ce favori — état neutre, honnête,
  // plutôt qu'une carte de deal vide ou inventée.
  if (!offers || offers.length === 0) {
    return (
      <div className="rp-ticket" style={{ background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.ink }}>{query}</div>
          <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
            Suivi depuis le {addedAt?.slice(0, 10)} · aucune anomalie de prix en ce moment
          </div>
        </div>
        <button
          onClick={() => onOpenSearch(query)}
          style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}
        >
          🔄 Relancer
        </button>
      </div>
    );
  }

  const best = [...offers].sort((a, b) => b.score - a.score)[0];
  return <DealCard item={best} authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />;
}

function FavorisView({ token, onBack, onOpenSearch, onOpenDetail, onNeedAuth }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiWatchlistGet(token).then(setItems).catch((e) => setError(e.message));
  }, [token]);

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        ← Accueil
      </button>
      <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>⭐ Mes favoris</h2>
      {error && <p style={{ color: T.red, fontSize: 13 }}>{error}</p>}
      {items && items.length === 0 && <p style={{ color: T.sub, fontSize: 14 }}>Aucun favori pour l'instant — clique sur "★ Suivre" sur une page de résultats pour en ajouter.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items?.map((it) => (
          <FavoriteCard
            key={it.query}
            query={it.query}
            addedAt={it.created_at}
            authToken={token}
            onNeedAuth={onNeedAuth}
            onOpenDetail={onOpenDetail}
            onOpenSearch={onOpenSearch}
          />
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
      <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>💬 Chat de la communauté</h2>

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
              <div key={m.id} className="msg-slide-in" style={{ display: "flex", gap: 8 }}>
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
            <button onClick={sendPublic} className="rp-pressable" style={{ padding: "0 16px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
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
            <button onClick={sendDm} className="rp-pressable" style={{ padding: "0 16px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


/* ── Petits styles partagés entre les vues Communauté / Forum ──── */
const backButtonStyle = { background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" };
const emberButtonStyle = { padding: "9px 16px", borderRadius: 10, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" };
const inputStyle = { padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif", width: "100%" };
function pillTabStyle(active) {
  return { flex: 1, padding: "9px 14px", borderRadius: 7, border: "none", background: active ? T.ember : "transparent", color: active ? "#0C0E14" : T.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" };
}
function voteBtnStyle(active, isDown) {
  return {
    width: 28,
    height: 24,
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: active ? (isDown ? "rgba(255,59,48,0.18)" : "rgba(47,217,139,0.18)") : "transparent",
    color: active ? (isDown ? T.red : T.green) : T.sub,
    fontWeight: 900,
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
  };
}

/* ── Communauté : "Choix de la communauté" — deals soumis + votés par les membres ── */
function CommunityPicksView({ token, onBack, onNeedAuth }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState("hot");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "", price: "", category: "tout" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async (s) => {
    setError(null);
    try {
      const data = await apiCommunityListDeals(token, "tout", s || sort, 1, 30);
      setItems(data.items);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const vote = async (deal, value) => {
    if (!token) {
      onNeedAuth();
      return;
    }
    try {
      const cancelling = deal.myVote === value;
      const updated = cancelling ? await apiCommunityRemoveVote(token, deal.id) : await apiCommunityVote(token, deal.id, value);
      setItems((prev) => prev.map((d) => (d.id === deal.id ? { ...d, ...updated, myVote: cancelling ? null : value } : d)));
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async () => {
    if (!token) {
      onNeedAuth();
      return;
    }
    if (!form.title.trim()) {
      setFormError("Le titre du deal est requis.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiCommunitySubmitDeal(token, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        url: form.url.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
        category: form.category,
      });
      setForm({ title: "", description: "", url: "", price: "", category: "tout" });
      setShowForm(false);
      load(sort);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={backButtonStyle}>
        ← Accueil
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900 }}>🏆 Choix de la communauté</h2>
        <button onClick={() => (token ? setShowForm((v) => !v) : onNeedAuth())} style={emberButtonStyle}>
          {showForm ? "Annuler" : "+ Proposer un deal"}
        </button>
      </div>
      <p style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        Des deals trouvés et postés par les membres eux-mêmes. Votez pour les plus pertinents : plus un deal reçoit de votes, mieux il est classé.
      </p>

      {showForm && (
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {formError && <p style={{ color: T.red, fontSize: 12 }}>{formError}</p>}
          <input placeholder="Titre du deal *" value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          <textarea
            placeholder="Description (optionnel)"
            value={form.description}
            maxLength={1000}
            rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <input placeholder="Lien vers le deal (optionnel)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={inputStyle} />
          <div style={{ display: "flex", gap: 10 }}>
            <input placeholder="Prix € (optionnel)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={submit} disabled={submitting} style={{ ...emberButtonStyle, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Publication…" : "Publier le deal"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", background: T.surface2, borderRadius: 10, padding: 4, marginBottom: 16, width: "fit-content" }}>
        <button onClick={() => setSort("hot")} style={pillTabStyle(sort === "hot")}>
          🔥 Pertinents
        </button>
        <button onClick={() => setSort("new")} style={pillTabStyle(sort === "new")}>
          🆕 Récents
        </button>
      </div>

      {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {items === null && !error && <p style={{ color: T.sub, fontSize: 13 }}>Chargement…</p>}
      {items?.length === 0 && <p style={{ color: T.sub, fontSize: 13 }}>Aucun deal communautaire pour l'instant — soyez le premier à en proposer un !</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items?.map((d) => (
          <div key={d.id} style={{ display: "flex", gap: 12, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <button onClick={() => vote(d, 1)} aria-label="Voter pertinent" style={voteBtnStyle(d.myVote === 1)}>
                ▲
              </button>
              <span style={{ fontWeight: 900, fontSize: 13, color: T.ink }}>{(d.upvotes || 0) - (d.downvotes || 0)}</span>
              <button onClick={() => vote(d, -1)} aria-label="Voter pas pertinent" style={voteBtnStyle(d.myVote === -1, true)}>
                ▼
              </button>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{d.title}</h3>
                {d.price != null && (
                  <span style={{ fontWeight: 900, color: T.emberSolid, whiteSpace: "nowrap" }}>{Number(d.price).toFixed(2)} €</span>
                )}
              </div>
              {d.description && <p style={{ fontSize: 13, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>{d.description}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <Avatar email={d.author} avatarUrl={d.avatar_url} size={20} />
                <span style={{ fontSize: 11.5, color: T.sub }}>
                  {d.author} · {d.created_at?.slice(0, 10)}
                </span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.emberSolid, fontWeight: 800, marginLeft: "auto" }}>
                    Voir l'offre →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ── Communauté : Forum (catégories → sujets) ──────────────────── */
function ForumView({ token, onBack, onOpenThread }) {
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [threads, setThreads] = useState(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    apiForumCategories().then(setCategories).catch((e) => setError(e.message));
  }, []);

  const openCategory = async (cat) => {
    setActiveCategory(cat);
    setThreads(null);
    setShowNewThread(false);
    setError(null);
    try {
      const data = await apiForumThreads(cat.slug);
      setThreads(data.items);
    } catch (e) {
      setError(e.message);
    }
  };

  const createThread = async () => {
    if (!token || !activeCategory) return;
    if (!newTitle.trim() || !newBody.trim()) {
      setError("Titre et message sont requis.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const thread = await apiForumCreateThread(token, activeCategory.slug, newTitle.trim(), newBody.trim());
      setNewTitle("");
      setNewBody("");
      setShowNewThread(false);
      onOpenThread(thread.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={activeCategory ? () => setActiveCategory(null) : onBack} style={backButtonStyle}>
        {activeCategory ? "← Catégories" : "← Accueil"}
      </button>

      {!activeCategory && (
        <>
          <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>🗂️ Forum</h2>
          {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
          {categories === null && !error && <p style={{ color: T.sub, fontSize: 13 }}>Chargement…</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories?.map((c) => (
              <button key={c.id} onClick={() => openCategory(c)} style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{c.name}</h3>
                  <span style={{ fontSize: 12, color: T.sub, fontWeight: 700, flexShrink: 0 }}>
                    {c.thread_count} sujet{c.thread_count > 1 ? "s" : ""}
                  </span>
                </div>
                {c.description && <p style={{ fontSize: 13, color: T.sub, marginTop: 6, lineHeight: 1.5 }}>{c.description}</p>}
              </button>
            ))}
          </div>
        </>
      )}

      {activeCategory && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900 }}>{activeCategory.name}</h2>
            <button onClick={() => setShowNewThread((v) => !v)} style={emberButtonStyle}>
              {showNewThread ? "Annuler" : "+ Nouveau sujet"}
            </button>
          </div>
          {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
          {showNewThread && (
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Titre du sujet" value={newTitle} maxLength={150} onChange={(e) => setNewTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Votre message…" value={newBody} maxLength={5000} rows={4} onChange={(e) => setNewBody(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
              <button onClick={createThread} disabled={posting} style={{ ...emberButtonStyle, opacity: posting ? 0.6 : 1 }}>
                {posting ? "Publication…" : "Publier le sujet"}
              </button>
            </div>
          )}
          {threads === null && !error && <p style={{ color: T.sub, fontSize: 13 }}>Chargement…</p>}
          {threads?.length === 0 && <p style={{ color: T.sub, fontSize: 13 }}>Aucun sujet dans cette catégorie — lancez la discussion !</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {threads?.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenThread(t.id)}
                style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
                    {t.author} · {t.last_activity_at?.slice(0, 10)}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 800, flexShrink: 0 }}>{t.reply_count} 💬</span>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/* ── Communauté : Forum — détail d'un sujet + réponses ─────────── */
function ThreadDetailView({ threadId, token, currentUserId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    apiForumThread(threadId).then(setData).catch((e) => setError(e.message));
  }, [threadId]);

  const reply = async () => {
    if (!token || !replyText.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const replies = await apiForumReply(token, threadId, replyText.trim());
      setData((prev) => ({ ...prev, replies }));
      setReplyText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  if (!data) {
    return (
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
        <button onClick={onBack} style={backButtonStyle}>← Retour</button>
        {error ? <p style={{ color: T.red, fontSize: 13 }}>{error}</p> : <p style={{ color: T.sub, fontSize: 13 }}>Chargement…</p>}
      </main>
    );
  }

  const { thread, replies } = data;
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={backButtonStyle}>← {thread.category_name}</button>
      <h2 className="rp-display" style={{ fontSize: 19, fontWeight: 900, marginBottom: 12 }}>{thread.title}</h2>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Avatar email={thread.author} avatarUrl={thread.avatar_url} size={26} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: T.ink }}>{thread.author}</div>
            <div style={{ fontSize: 11, color: T.sub }}>{thread.created_at?.slice(0, 16).replace("T", " ")}</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{thread.body}</p>
      </div>

      <h3 style={{ fontSize: 13, color: T.sub, fontWeight: 800, marginBottom: 10 }}>
        {replies.length} réponse{replies.length > 1 ? "s" : ""}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {replies.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 8 }}>
            <Avatar email={r.author} avatarUrl={r.avatar_url} size={24} />
            <div style={{ minWidth: 0, background: T.surface2, borderRadius: 10, padding: "8px 12px", flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>
                <strong style={{ color: r.user_id === currentUserId ? T.emberSolid : T.ink }}>{r.author}</strong>{" "}
                <span style={{ color: T.sub, fontSize: 10.5 }}>{r.created_at?.slice(0, 16).replace("T", " ")}</span>
              </div>
              <div style={{ fontSize: 13.5, color: T.ink, whiteSpace: "pre-wrap" }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {token ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reply()}
            maxLength={5000}
            placeholder="Votre réponse…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif" }}
          />
          <button
            onClick={reply}
            disabled={posting}
            style={{ padding: "0 16px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: posting ? 0.6 : 1 }}
          >
            Répondre
          </button>
        </div>
      ) : (
        <p style={{ color: T.sub, fontSize: 13 }}>Connectez-vous pour répondre à ce sujet.</p>
      )}
    </main>
  );
}

export default function RadarPrixSite() {
  const [view, setView] = useState("home");
  const [legalPage, setLegalPage] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null); // { id, email, role, pseudo, avatar_url }
  const [followMsg, setFollowMsg] = useState(null);
  const [dealDetailItem, setDealDetailItem] = useState(null);

  // Ouvre une des trois sous-pages du menu "Communauté" (connexion requise, comme le reste de l'espace membre).
  const goToCommunity = (targetView) => {
    setCommunityMenuOpen(false);
    if (!authToken) {
      setAuthOpen(true);
      return;
    }
    setView(targetView);
    window.scrollTo(0, 0);
  };

  // Ouvre la fiche produit détaillée d'un deal (cliqué depuis une DealCard).
  const openDealDetail = (item) => {
    setDealDetailItem(item);
    setView("dealDetail");
    window.scrollTo(0, 0);
  };

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

  // Recherche libre (barre de recherche). Deux étapes :
  // 1) D'abord parcourir les deals déjà détectés par le cron qui matchent ce
  //    mot-clé (instantané, gratuit, et fiable même sur un terme large comme
  //    "pc" — chaque deal a déjà été comparé à ses propres pairs/historique,
  //    jamais à un autre produit).
  // 2) Si rien ne matche, lancer un vrai scan SerpApi en direct sur ce terme
  //    précis — pertinent pour un produit spécifique pas encore au catalogue.
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
    setLastScan(null);
    try {
      const catalogMatch = await fetchDeals("tout", 1, 30, term);
      if (catalogMatch.items.length > 0) {
        setItems(catalogMatch.items);
        setScannedQuery(term);
        setHasMore(false);
        return;
      }
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

  // Détermine l'onglet actif dans MobileNav à partir de l'état de navigation existant.
  const mobileNavActive =
    view === "favoris" ? "favoris" :
    view === "results" && tab === "erreurs" ? "erreurs" :
    view === "results" ? "deals" :
    view === "home" ? "home" :
    null;

  const handleMobileNav = (key) => {
    if (key === "home") return goHome();
    if (key === "deals") return openTab("deals");
    if (key === "erreurs") return openTab("erreurs");
    if (key === "favoris") {
      if (!authToken) return setAuthOpen(true);
      setView("favoris");
      window.scrollTo(0, 0);
      return;
    }
    if (key === "profil") return authToken ? setProfileMenuOpen(true) : setAuthOpen(true);
  };

  return (
    <div
      className="rp-body"
      onClick={() => {
        if (profileMenuOpen) setProfileMenuOpen(false);
        if (communityMenuOpen) setCommunityMenuOpen(false);
      }}
      style={{ background: T.bg, color: T.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <GlobalStyles />

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(12,14,20,0.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, minWidth: 0 }}>
            <button onClick={goHome} className="rp-display" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 900, color: T.ink, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <img src="/design-system/01_LOGOS/logo_icon_radar.svg" alt="" aria-hidden="true" width={26} height={26} style={{ flexShrink: 0 }} />
              RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
            </button>
            {view === "results" && (
              <div style={{ flex: "1 1 100px", minWidth: 0, maxWidth: 340, marginLeft: 14 }}>
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
          {/* overflowX: "visible" (pas "auto") : un axe non-"visible" forcerait l'autre à "auto" en CSS,
              ce qui découperait le menu déroulant "Communauté" qui dépasse verticalement sous la barre. */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", overflowX: "visible", paddingBottom: 6 }}>
            <button className={`rp-tab ${view === "results" && tab === "deals" ? "active" : ""}`} onClick={() => openTab("deals")}>
              🔥 Gros deals
            </button>
            <button className={`rp-tab ${view === "results" && tab === "erreurs" ? "active" : ""}`} onClick={() => openTab("erreurs")}>
              🔴 Erreurs de prix
            </button>
            <button className={`rp-tab ${view === "favoris" ? "active" : ""}`} onClick={() => (authToken ? setView("favoris") : setAuthOpen(true))}>
              ⭐ Favoris
            </button>
            <div className="rp-dropdown-wrap" onMouseEnter={() => setCommunityMenuOpen(true)} onMouseLeave={() => setCommunityMenuOpen(false)}>
              <button
                className={`rp-tab ${COMMUNITY_VIEWS.includes(view) ? "active" : ""}`}
                aria-haspopup="true"
                aria-expanded={communityMenuOpen}
                onClick={(e) => {
                  // Ne bascule pas (toggle) : un survol suivi d'un clic (souris) doit laisser le
                  // menu ouvert, pas le refermer aussitôt. Un clic répété (tactile) le rouvre simplement ;
                  // il se referme via onMouseLeave ou un clic à l'extérieur (voir le onClick racine).
                  e.stopPropagation();
                  setCommunityMenuOpen(true);
                }}
              >
                👥 Communauté <span style={{ fontSize: 9 }}>▾</span>
              </button>
              {communityMenuOpen && (
                <div className="rp-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                  <button className="rp-dropdown-item" role="menuitem" onClick={() => goToCommunity("communaute-picks")}>
                    <span>🏆</span>
                    <span>
                      Choix de la communauté
                      <span className="rp-dropdown-desc">Deals postés et votés par les membres</span>
                    </span>
                  </button>
                  <button className="rp-dropdown-item" role="menuitem" onClick={() => goToCommunity("communaute-chat")}>
                    <span>💬</span>
                    <span>
                      Chat
                      <span className="rp-dropdown-desc">Salon général et messages privés</span>
                    </span>
                  </button>
                  <button className="rp-dropdown-item" role="menuitem" onClick={() => goToCommunity("communaute-forum")}>
                    <span>🗂️</span>
                    <span>
                      Forum
                      <span className="rp-dropdown-desc">Sujets par catégorie, avec réponses</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1 }}>
        {view === "home" && (
          <>
            <header style={{ maxWidth: 960, margin: "0 auto", padding: "54px 18px 20px", textAlign: "center", position: "relative" }}>
              <div aria-hidden="true" style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(255,106,53,0.14), transparent 65%)", pointerEvents: "none" }} />
              <div
                aria-hidden="true"
                className="rp-radar-sweep"
                style={{
                  position: "absolute",
                  top: -80,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 600,
                  height: 400,
                  background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,161,37,0.10) 18deg, transparent 40deg)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              <h1 className="rp-display" style={{ fontSize: "clamp(24px, 6vw, 42px)", fontWeight: 900, lineHeight: 1.15 }}>
                Quand le marchand se trompe,
                <br />
                <span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>vous gagnez.</span>
              </h1>
              <p style={{ maxWidth: 500, margin: "16px auto 26px", color: T.sub, fontSize: 15, lineHeight: 1.6 }}>
                Erreurs de prix et très gros deals, détectés par un algorithme qui compare en continu les prix réels des marchands français.
              </p>

              <div style={{ maxWidth: 520, margin: "0 auto" }}>
                <SearchBar big onSearch={(t) => searchProduct(t)} placeholder="Rechercher un produit : PS5, aspirateur, iPhone..." />
              </div>
            </header>

            <HomeStatsBar />

            <HomeDealsSection
              authToken={authToken}
              onNeedAuth={() => setAuthOpen(true)}
              onSeeAll={() => openTab("deals")}
              onOpenDetail={openDealDetail}
            />

            <HomeErrorsSection
              authToken={authToken}
              onNeedAuth={() => setAuthOpen(true)}
              onSeeAll={() => openTab("erreurs")}
              onOpenDetail={openDealDetail}
            />

            <section style={{ background: T.surface, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, marginTop: 40 }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 18px" }}>
                <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 32 }}>Comment ça marche</h2>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center", gap: 4 }}>
                  {[
                    { n: 1, icon: "📡", iconBg: "#181B39", title: "Scan en continu", text: "Nos robots interrogent en temps réel les prix chez des milliers de marchands français." },
                    { n: 2, icon: "🧮", iconBg: "#332818", title: "Analyse intelligente", text: "Un algorithme compare chaque prix à l'historique déjà observé et à la médiane du marché." },
                    { n: 3, icon: "🚨", iconBg: "#2C1420", title: "Détection d'anomalies", text: "Les bons plans et les erreurs de prix sont repérés et notés automatiquement sur 100." },
                    { n: 4, icon: "🔔", iconBg: "#2E2318", title: "Vous en profitez", text: "Consultez les deals et erreurs détectés, suivez vos recherches, foncez avant tout le monde." },
                  ].map((s, i, arr) => (
                    <Reveal key={s.title} style={{ display: "flex", alignItems: "flex-start" }}>
                      <div style={{ width: 210, padding: "0 6px" }}>
                        <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 12, background: s.iconBg, fontSize: 22, marginBottom: 14 }}>
                          {s.icon}
                        </span>
                        <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6, color: T.ink }}>{s.n}. {s.title}</h3>
                        <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55 }}>{s.text}</p>
                      </div>
                      {i < arr.length - 1 && (
                        <span aria-hidden="true" style={{ color: T.sub, fontSize: 18, padding: "12px 4px 0", flexShrink: 0 }}>→</span>
                      )}
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ maxWidth: 680, margin: "0 auto", padding: "48px 18px 10px" }}>
              <h2 className="rp-display" style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 20 }}>Questions fréquentes</h2>
              <Reveal>
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
              </Reveal>
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
              <h2 className="rp-display" style={{ fontSize: 20, fontWeight: 900, flex: 1, minWidth: 0, overflowWrap: "break-word" }}>
                {searchTerm ? `🔎 « ${searchTerm} »` : tab === "erreurs" ? "🔴 Erreurs de prix" : "🔥 Gros deals"}
              </h2>
              <button
                onClick={followCurrentSearch}
                className="rp-pressable rp-cta"
                style={{ flexShrink: 0, background: "none", border: `1.5px solid ${T.emberSolid}`, borderRadius: 8, padding: "7px 12px", color: T.ink, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                ★ Suivre
              </button>
            </div>
            {followMsg && <p className="toast-in" style={{ fontSize: 12, color: T.green, marginBottom: 6 }}>{followMsg}</p>}
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
                <>
                  <div style={{ textAlign: "center", color: T.sub, fontSize: 13, marginBottom: 4 }}>
                    Interrogation des marchands en cours…
                  </div>
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonCard key={`skeleton-${i}`} />
                  ))}
                </>
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
                <DealCard key={i} item={it} index={i} authToken={authToken} onNeedAuth={() => setAuthOpen(true)} onOpenDetail={openDealDetail} />
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

        {view === "dealDetail" && dealDetailItem && (
          <ProductDetailView
            item={dealDetailItem}
            authToken={authToken}
            onNeedAuth={() => setAuthOpen(true)}
            onBack={goHome}
            onOpenDetail={openDealDetail}
          />
        )}

        {view === "favoris" && authToken && (
          <FavorisView
            token={authToken}
            onBack={goHome}
            onOpenSearch={(q) => searchProduct(q)}
            onOpenDetail={openDealDetail}
            onNeedAuth={() => setAuthOpen(true)}
          />
        )}

        {view === "communaute-chat" && authToken && (
          <CommunityView token={authToken} currentUserId={authUser?.id} onBack={goHome} />
        )}

        {view === "communaute-picks" && authToken && (
          <CommunityPicksView token={authToken} onBack={goHome} onNeedAuth={() => setAuthOpen(true)} />
        )}

        {view === "communaute-forum" && authToken && (
          <ForumView
            token={authToken}
            onBack={goHome}
            onOpenThread={(id) => {
              setActiveThreadId(id);
              setView("communaute-forum-thread");
              window.scrollTo(0, 0);
            }}
          />
        )}

        {view === "communaute-forum-thread" && authToken && activeThreadId && (
          <ThreadDetailView
            threadId={activeThreadId}
            token={authToken}
            currentUserId={authUser?.id}
            onBack={() => setView("communaute-forum")}
          />
        )}
      </div>

      <MobileNav active={mobileNavActive} onNavigate={handleMobileNav} />
      <Footer
        setLegalPage={setLegalPage}
        goHome={goHome}
        openTab={openTab}
        goToCommunity={goToCommunity}
        authToken={authToken}
        onNeedAuth={() => setAuthOpen(true)}
        onOpenFavoris={() => { setView("favoris"); window.scrollTo(0, 0); }}
      />
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
