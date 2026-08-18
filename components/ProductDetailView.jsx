// ProductDetailView.jsx — Fiche produit détaillée, calquée sur la maquette
// desktop fournie : colonne image + prix à gauche, tuiles "pourquoi" et
// historique à droite, tableau comparatif et communauté en pleine largeur.
// N'affiche que des tuiles adossées à une vraie donnée — pas de nombre de
// vendeurs / stock / fiabilité inventés, ces données n'existent pas encore
// côté backend.
import { useState, useEffect } from "react";
import { T, CATEGORIES } from "../theme.js";
import { fetchDeals, apiGetLatest, apiWatchlistAdd } from "../api.js";
import { relativeTime } from "../utils.js";
import { PriceHistoryPanel, CommentsPanel } from "./panels.jsx";
import DealCard from "./DealCard.jsx";
import MerchantBadge from "./MerchantBadge.jsx";
import AnimatedPrice from "./AnimatedPrice.jsx";

function panelCardStyle(extra) {
  return { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18, ...extra };
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h3 className="rp-display" style={{ fontSize: 14, fontWeight: 900, color: T.ink }}>{children}</h3>
      {action}
    </div>
  );
}

export default function ProductDetailView({ item, authToken, onNeedAuth, onBack, onOpenDetail }) {
  const isErr = item.verdict === "erreur";
  const isGem = item.score >= 85;
  const [followMsg, setFollowMsg] = useState(null);
  const seenAgo = relativeTime(item.scraped_at);
  const categoryLabel = CATEGORIES.find((c) => c.id === item.category)?.label?.split(" / ")[0];

  const [offers, setOffers] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiGetLatest(item.name)
      .then((items) => !cancelled && setOffers(items))
      .catch(() => !cancelled && setOffers([item]));
    return () => { cancelled = true; };
  }, [item.name]);

  const [similar, setSimilar] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchDeals(item.category || "tout", 1, 6)
      .then((data) => !cancelled && setSimilar((data.items || []).filter((it) => it.name !== item.name).slice(0, 5)))
      .catch(() => !cancelled && setSimilar([]));
    return () => { cancelled = true; };
  }, [item.category, item.name]);

  const follow = async () => {
    if (!authToken) return onNeedAuth();
    try {
      await apiWatchlistAdd(authToken, item.name, item.category || "tout");
      setFollowMsg("✓ Ajouté à tes favoris");
      setTimeout(() => setFollowMsg(null), 2500);
    } catch (e) {
      setFollowMsg("Erreur : " + e.message);
      setTimeout(() => setFollowMsg(null), 3000);
    }
  };

  // L'URL courante contient déjà ?produit=... (mise à jour par openDealDetail
  // dans RadarPrixSite.jsx), donc partager la page courante suffit — le lien
  // reste valide tant que le deal est actif (relu via apiGetLatest à l'ouverture).
  const [shareMsg, setShareMsg] = useState(null);
  const share = async () => {
    const shareData = {
      title: `${item.name} — RadarPrix`,
      text: `${item.name} à ${Number(item.price).toFixed(2).replace(".", ",")} € repéré par RadarPrix`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Annulation par l'utilisateur (bouton "Annuler" du partage natif) : rien à faire.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareMsg("✓ Lien copié");
    } catch {
      setShareMsg("Impossible de copier le lien");
    }
    setTimeout(() => setShareMsg(null), 2500);
  };

  const scoreLabel = item.score >= 85 ? "Excellent deal" : item.score >= 60 ? "Bon deal" : "À vérifier";
  const scoreColor = item.score >= 85 ? T.green : item.score >= 60 ? T.yellow : T.sub;

  // Confidence Score : distinct du Deal Score ci-dessus — pas "à quel point
  // le prix est intéressant" mais "à quel point on peut faire confiance à
  // CETTE détection" (pairs cohérents, confirmation par l'historique...).
  // Une remise énorme et isolée peut avoir un excellent Deal Score et une
  // confiance faible — c'est justement ce que cette valeur signale.
  const hasConfidence = item.confidence != null;
  const confidenceLabel = !hasConfidence ? "Non évaluable" : item.confidence >= 70 ? "Fiable" : item.confidence >= 40 ? "À vérifier" : "Peu fiable";
  const confidenceColor = !hasConfidence ? T.sub : item.confidence >= 70 ? T.green : item.confidence >= 40 ? T.yellow : T.red;

  const whyTiles = [
    item.pct > 0 && { icon: "📉", color: isErr ? T.red : T.green, label: "vs référence marché", value: `−${item.pct}%` },
    item.allTimeLow && { icon: "🏆", color: T.green, label: "Historique", value: "Plus bas prix enregistré" },
    seenAgo && { icon: "🕒", color: T.purple, label: "Fraîcheur", value: `Vu ${seenAgo}` },
    hasConfidence && { icon: "💎", color: confidenceColor, label: "Fiabilité de la détection", value: `${confidenceLabel} (${item.confidence}/100)` },
  ].filter(Boolean);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "18px 16px 60px" }}>
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 16, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>Accueil</button>
        {categoryLabel && <><span>›</span><span>{categoryLabel}</span></>}
        <span>›</span>
        <span style={{ color: T.ink, fontWeight: 700 }}>{item.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, alignItems: "start" }}>
        {/* Colonne gauche : image + prix + CTA */}
        <div className="fade-up rp-ticket" style={panelCardStyle({ display: "flex", flexDirection: "column", gap: 14 })}>
          {isErr && <div className="rp-zigzag" aria-hidden="true" style={{ margin: "-18px -18px 0" }} />}
          <div style={{ height: 220, borderRadius: 12, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {item.img ? (
              <img src={item.img} alt={item.name} onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ maxWidth: "72%", maxHeight: "80%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 48, opacity: 0.35 }}>📦</span>
            )}
            {item.pct > 0 && (
              <span style={{ position: "absolute", top: 12, left: 12, background: isErr ? T.red : T.purple, color: "#fff", fontSize: 12, fontWeight: 800, padding: "5px 10px", borderRadius: 6 }}>
                −{item.pct}%
              </span>
            )}
          </div>

          <div>
            <span className="stamp-badge" style={{ display: "inline-block", background: isErr ? T.red : T.yellow, color: "#0C0E14", fontFamily: "'Unbounded', system-ui, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "5px 9px", borderRadius: 6, marginBottom: 8 }}>
              {isErr ? "ERREUR ?" : isGem ? "PÉPITE DU MOMENT" : "GROS DEAL"}
            </span>
            <h1 className="rp-display" style={{ fontSize: 19, fontWeight: 900, color: T.ink, lineHeight: 1.3 }}>{item.name}</h1>
            {seenAgo && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, marginTop: 4 }}>
                <span className="rp-fresh-dot" aria-hidden="true" />
                Détecté {seenAgo}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <AnimatedPrice
              from={item.refPrice > item.price ? item.refPrice : item.price}
              to={Number(item.price)}
              className="rp-display"
              style={{ fontSize: 30, fontWeight: 900, color: isErr ? T.red : T.ink }}
            />
            {item.refPrice > 0 && (
              <span style={{ color: T.sub, textDecoration: "line-through", fontSize: 15 }}>
                {Number(item.refPrice).toFixed(0)} €
              </span>
            )}
          </div>

          {item.seller && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.sub }}>
              <MerchantBadge name={item.seller} size={24} />
              <strong style={{ color: T.ink }}>{item.seller}</strong>
            </div>
          )}

          {/* Score, en barre de progression plutôt qu'en simple texte */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: T.sub }}>Score RadarPrix</span>
              <span style={{ color: scoreColor, fontWeight: 800 }}>{item.score}/100 · {scoreLabel}</span>
            </div>
            <div style={{ height: 8, borderRadius: 20, background: T.surface2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${item.score}%`, borderRadius: 20, background: scoreColor }} />
            </div>
          </div>

          {hasConfidence && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: T.sub }}>Confiance dans la détection</span>
                <span style={{ color: confidenceColor, fontWeight: 800 }}>{item.confidence}/100 · {confidenceLabel}</span>
              </div>
              <div style={{ height: 8, borderRadius: 20, background: T.surface2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${item.confidence}%`, borderRadius: 20, background: confidenceColor }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="rp-cta" style={{ flex: 1, textAlign: "center", padding: "12px 18px", borderRadius: 10, background: isErr ? T.red : T.ember, color: isErr ? "#fff" : "#0C0E14", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                Voir le deal →
              </a>
            )}
            <button onClick={follow} aria-label="Suivre ce produit" className="rp-pressable" style={{ padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
              ♥
            </button>
            <button onClick={share} aria-label="Partager ce deal" className="rp-pressable" style={{ padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${T.line}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
              ⤴
            </button>
          </div>
          {followMsg && <p className="toast-in" style={{ fontSize: 12, color: followMsg.startsWith("Erreur") ? T.red : T.green, margin: 0 }}>{followMsg}</p>}
          {shareMsg && <p className="toast-in" style={{ fontSize: 12, color: T.green, margin: 0 }}>{shareMsg}</p>}
        </div>

        {/* Colonne droite : pourquoi + historique */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={panelCardStyle({})}>
            <SectionTitle>Pourquoi RadarPrix a repéré ce prix</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {whyTiles.map((t) => (
                <div key={t.label} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{t.icon}</div>
                  <div className="rp-display" style={{ fontSize: 13.5, fontWeight: 800, color: t.color }}>{t.value}</div>
                  <div style={{ fontSize: 10.5, color: T.sub, marginTop: 2 }}>{t.label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.sub, marginTop: 12, lineHeight: 1.5 }}>
              ⚠️ Score calculé automatiquement à partir des prix observés — vérifiez toujours l'offre avant d'acheter.
            </p>
          </div>
        </div>
      </div>

      {/* Historique des prix — en pleine largeur plutôt que casé dans la
          colonne étroite, pour lui donner la place qu'il mérite. */}
      <section style={{ marginTop: 20 }}>
        <div style={panelCardStyle({})}>
          <SectionTitle>Historique des prix</SectionTitle>
          <PriceHistoryPanel query={item.name} height={240} />
        </div>
      </section>

      {/* Comparer les prix */}
      <section style={{ marginTop: 20 }}>
        <div style={panelCardStyle({})}>
          <SectionTitle>Comparer les prix</SectionTitle>
          {offers === null && <p style={{ fontSize: 13, color: T.sub }}>Chargement…</p>}
          {offers && offers.length > 0 && (
            <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", padding: "9px 14px", background: T.surface2, fontSize: 10.5, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span style={{ flex: 1 }}>Vendeur</span>
                <span style={{ width: 90, textAlign: "right" }}>Score</span>
                <span style={{ width: 100, textAlign: "right" }}>Prix</span>
              </div>
              {[...offers].sort((a, b) => Number(a.price) - Number(b.price)).map((o, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: i % 2 ? T.surface : "transparent", borderTop: `1px solid ${T.line}` }}>
                  <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.ink, minWidth: 0 }}>
                    <MerchantBadge name={o.seller} size={20} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.seller || "Vendeur inconnu"}</span>
                    {o.verdict === "erreur" && <span style={{ fontSize: 9, color: T.red, fontWeight: 800, flexShrink: 0 }}>ERREUR</span>}
                  </span>
                  <span style={{ width: 90, textAlign: "right", fontSize: 12.5, color: T.sub }}>{o.score}/100</span>
                  <span className="rp-display" style={{ width: 100, textAlign: "right", fontSize: 14.5, fontWeight: 900, color: T.ink }}>{Number(o.price).toFixed(2).replace(".", ",")} €</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 11, color: T.sub, marginTop: 10, lineHeight: 1.5 }}>
            Seules les offres jugées anormales par l'algorithme sont comparées ici — un tableau avec tous les vendeurs scannés nécessitera une petite évolution du backend.
          </p>
        </div>
      </section>

      {/* Communauté */}
      <section style={{ marginTop: 20 }}>
        <div style={panelCardStyle({})}>
          <SectionTitle>💬 Ce que dit la communauté</SectionTitle>
          <CommentsPanel query={item.name} authToken={authToken} onNeedAuth={onNeedAuth} />
        </div>
      </section>

      {/* Deals similaires */}
      {similar && similar.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <SectionTitle>Deals similaires à ne pas manquer</SectionTitle>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6 }}>
            {similar.map((it, i) => (
              <div key={i} style={{ minWidth: 220, maxWidth: 220, flexShrink: 0 }}>
                <DealCard item={it} index={i} onOpenDetail={onOpenDetail} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
