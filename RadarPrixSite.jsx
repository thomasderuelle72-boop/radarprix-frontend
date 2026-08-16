import { useState, useEffect } from "react";

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

/* ── Connexion / inscription ───────────────────────────────── */
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
      localStorage.setItem("radarprix_token", data.token);
      localStorage.setItem("radarprix_email", data.user.email);
      onSuccess(data.token, data.user.email);
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


function Sticker({ item }) {
  const isGem = item.score >= 85;
  const isErr = item.verdict === "erreur";
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
      {isGem && (
        <div className="rp-display" style={{ fontSize: 11, letterSpacing: "0.08em", color: T.yellow }}>
          💎 PÉPITE · score {item.score}/100
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
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", alignSelf: "flex-start", padding: "9px 16px", borderRadius: 8, background: isErr ? T.red : T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13, textDecoration: "none" }}
        >
          Voir l'offre →
        </a>
      )}
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
export default function RadarPrixSite() {
  const [view, setView] = useState("home");
  const [legalPage, setLegalPage] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authEmail, setAuthEmail] = useState(null);
  const [followMsg, setFollowMsg] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("radarprix_token");
    const e = localStorage.getItem("radarprix_email");
    if (t && e) {
      setAuthToken(t);
      setAuthEmail(e);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("radarprix_token");
    localStorage.removeItem("radarprix_email");
    setAuthToken(null);
    setAuthEmail(null);
  };

  const followCurrentSearch = async () => {
    if (!authToken) {
      setAuthOpen(true);
      return;
    }
    if (!lastQuery) return;
    try {
      await apiWatchlistAdd(authToken, lastQuery.query, lastQuery.category);
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
  const [lastQuery, setLastQuery] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [maxPrice, setMaxPrice] = useState("");
  const [scannedQuery, setScannedQuery] = useState(null);

  useEffect(() => {
    document.title = "RadarPrix — Le détecteur d'erreurs de prix";
  }, []);

  const startScan = async (newTab, opts = {}) => {
    const catId = opts.category !== undefined ? opts.category : category;
    // Recherche libre (barre de recherche) : on envoie le terme exact.
    // Scan par onglet/catégorie : on n'envoie PAS de requête — c'est le
    // backend qui choisit un vrai produit dans son catalogue.
    const term = opts.term || null;

    setTab(newTab);
    setSearchTerm(term || "");
    setVerdictFilter(newTab === "erreurs" ? "erreur" : "all");
    setView("results");
    window.scrollTo(0, 0);
    setLoading(true);
    setError(null);
    setItems(null);
    setScannedQuery(null);
    setLastQuery({ query: term, category: catId });

    try {
      const { items: found, scannedQuery: sq } = await scanBackend(term, catId);
      setItems(found);
      setScannedQuery(sq);
      setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error(e);
      setError("Le scan a échoué : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const rescan = async () => {
    if (!lastQuery || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const { items: found, scannedQuery: sq } = await scanBackend(lastQuery.query, lastQuery.category);
      const seen = new Set((items || []).map((i) => (i.name || "").toLowerCase().slice(0, 40)));
      const fresh = found.filter((i) => !seen.has((i.name || "").toLowerCase().slice(0, 40)));
      setItems([...(items || []), ...fresh]);
      setScannedQuery(sq);
      setLastScan(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError("Le nouveau scan a échoué : " + e.message);
    } finally {
      setLoadingMore(false);
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
    <div className="rp-body" style={{ background: T.bg, color: T.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GlobalStyles />

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(12,14,20,0.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>
            <button onClick={goHome} className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              RADAR<span style={{ background: T.ember, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIX</span>
            </button>
            {view === "results" && (
              <div style={{ flex: 1, maxWidth: 340, marginLeft: 14 }}>
                <SearchBar onSearch={(t) => startScan("deals", { term: t, category: "tout" })} />
              </div>
            )}
            <button
              onClick={() => (authToken ? logout() : setAuthOpen(true))}
              style={{ marginLeft: 12, background: "none", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "6px 12px", color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" }}
            >
              {authToken ? `👤 ${authEmail} · déconnexion` : "Connexion"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 2 }}>
            <button className={`rp-tab ${view === "results" && tab === "deals" ? "active" : ""}`} onClick={() => startScan("deals")}>
              🔥 Gros deals
            </button>
            <button className={`rp-tab ${view === "results" && tab === "erreurs" ? "active" : ""}`} onClick={() => startScan("erreurs")}>
              🔴 Erreurs de prix
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
                <SearchBar big onSearch={(t) => startScan("deals", { term: t, category: "tout" })} placeholder="Cherchez un produit : PS5, aspirateur, iPhone…" />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
                {[["deals", "🔥 Gros deals"], ["erreurs", "🔴 Erreurs de prix"]].map(([m, label]) => (
                  <button key={m} onClick={() => startScan(m)} style={{ padding: "12px 18px", borderRadius: 12, border: `1.5px solid ${T.line}`, background: T.surface, color: T.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
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
                {!searchTerm && scannedQuery && (
                  <>
                    Produit scanné : <strong style={{ color: T.ink }}>{scannedQuery}</strong> ·{" "}
                  </>
                )}
                Scan de {lastScan} · {visible.length}/{items ? items.length : 0} offre(s) affichée(s)
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
                  onClick={() => startScan(tab)}
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
                <Sticker key={i} item={it} />
              ))}
              {items && items.length > 0 && !loading && (
                <button
                  onClick={rescan}
                  disabled={loadingMore}
                  style={{ padding: "13px", borderRadius: 10, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: loadingMore ? T.sub : T.ink, fontWeight: 800, fontSize: 13.5, cursor: loadingMore ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  {loadingMore ? "Nouveau scan en cours…" : "🔄 Relancer un scan (nouveaux prix)"}
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
      </div>

      <Footer setLegalPage={setLegalPage} />
      <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={(token, email) => {
            setAuthToken(token);
            setAuthEmail(email);
            setAuthOpen(false);
          }}
        />
      )}
    </div>
  );
}
