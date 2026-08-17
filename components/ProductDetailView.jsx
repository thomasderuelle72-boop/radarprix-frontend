// ProductDetailView.jsx — Fiche produit détaillée d'un deal, ouverte en
// cliquant le titre/image d'une DealCard. Réutilise les panneaux existants
// (historique de prix, commentaires) en plein format, et n'affiche que des
// tuiles "pourquoi c'est une pépite" adossées à une vraie donnée — pas de
// nombre de vendeurs / disponibilité / tendance inventés, ces données
// n'existent pas encore côté backend (voir plan de refonte).
import { useState, useEffect } from "react";
import { T } from "../theme.js";
import { fetchDeals, apiGetLatest, apiWatchlistAdd } from "../api.js";
import { PriceHistoryPanel, CommentsPanel } from "./panels.jsx";
import DealCard from "./DealCard.jsx";

const tileStyle = {
  background: T.surface2,
  border: `1px solid ${T.line}`,
  borderRadius: 12,
  padding: "14px 16px",
  flex: "1 1 160px",
};

function SectionTitle({ children }) {
  return (
    <h3 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, marginBottom: 12 }}>
      {children}
    </h3>
  );
}

export default function ProductDetailView({ item, authToken, onNeedAuth, onBack, onOpenDetail }) {
  const isErr = item.verdict === "erreur";
  const [followMsg, setFollowMsg] = useState(null);

  const [offers, setOffers] = useState(null); // null = chargement
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
    fetchDeals(item.category || "tout", 1, 5)
      .then((data) => !cancelled && setSimilar((data.items || []).filter((it) => it.name !== item.name).slice(0, 4)))
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

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        ← Retour
      </button>

      <div className="fade-up rp-ticket" style={{ background: T.surface, border: `1.5px solid ${isErr ? T.red : T.line}`, borderRadius: 16, padding: "22px 22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        {isErr && <div className="rp-zigzag" aria-hidden="true" />}

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {item.img && (
            <img
              src={item.img}
              alt={item.name}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 14, background: T.surface2, border: `1px solid ${T.line}`, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
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
              }}
            >
              {isErr ? "ERREUR ?" : "GROS DEAL"}
            </span>
            <h1 className="rp-display" style={{ fontSize: 20, fontWeight: 900, color: T.ink, lineHeight: 1.3 }}>{item.name}</h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span className="rp-display" style={{ fontSize: 32, fontWeight: 900, color: isErr ? T.red : T.ink }}>
                {Number(item.price).toFixed(2).replace(".", ",")} €
              </span>
              {item.refPrice > 0 && (
                <span style={{ color: T.sub, textDecoration: "line-through", fontSize: 16 }}>
                  {Number(item.refPrice).toFixed(0)} €
                </span>
              )}
              {item.pct > 0 && <span style={{ color: isErr ? T.red : T.green, fontWeight: 800, fontSize: 16 }}>−{item.pct}%</span>}
            </div>
            {item.seller && <div style={{ fontSize: 13, color: T.sub }}>Vendu par <strong style={{ color: T.ink }}>{item.seller}</strong></div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 8, background: isErr ? T.red : T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 13.5, textDecoration: "none" }}>
                  Voir l'offre →
                </a>
              )}
              <button onClick={follow} style={{ padding: "10px 16px", borderRadius: 8, border: `1.5px solid ${T.emberSolid}`, background: "transparent", color: T.ink, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                ★ Suivre ce produit
              </button>
            </div>
            {followMsg && <p style={{ fontSize: 12, color: followMsg.startsWith("Erreur") ? T.red : T.green }}>{followMsg}</p>}
          </div>
        </div>
      </div>

      {/* Pourquoi RadarPrix pense que c'est une pépite — seulement des tuiles avec une vraie donnée */}
      <section style={{ marginTop: 28 }}>
        <SectionTitle>Pourquoi RadarPrix a repéré ce prix</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {item.pct > 0 && (
            <div style={tileStyle}>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>Écart vs prix de référence</div>
              <div className="rp-display" style={{ fontSize: 20, fontWeight: 900, color: isErr ? T.red : T.green }}>−{item.pct}%</div>
            </div>
          )}
          {typeof item.score === "number" && (
            <div style={tileStyle}>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>Score de confiance</div>
              <div className="rp-display" style={{ fontSize: 20, fontWeight: 900, color: T.purple }}>{item.score}/100</div>
            </div>
          )}
          {item.allTimeLow && (
            <div style={tileStyle}>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>Historique</div>
              <div className="rp-display" style={{ fontSize: 14, fontWeight: 800, color: T.green }}>🏆 Prix le plus bas jamais vu</div>
            </div>
          )}
        </div>
        <p style={{ fontSize: 11.5, color: T.sub, marginTop: 10, lineHeight: 1.5 }}>
          ⚠️ Ce score est calculé automatiquement à partir des prix observés — vérifiez toujours l'offre et le vendeur avant d'acheter.
        </p>
      </section>

      {/* Comparer les prix */}
      <section style={{ marginTop: 28 }}>
        <SectionTitle>Comparer les prix</SectionTitle>
        {offers === null && <p style={{ fontSize: 13, color: T.sub }}>Chargement…</p>}
        {offers && offers.length > 0 && (
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
            {[...offers].sort((a, b) => Number(a.price) - Number(b.price)).map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "11px 14px", background: i % 2 ? T.surface : T.surface2, borderBottom: i < offers.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{o.seller || "Vendeur inconnu"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {o.verdict === "erreur" && <span style={{ fontSize: 10, color: T.red, fontWeight: 800 }}>ERREUR ?</span>}
                  {o.verdict === "deal" && <span style={{ fontSize: 10, color: T.yellow, fontWeight: 800 }}>DEAL</span>}
                  <span className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>{Number(o.price).toFixed(2).replace(".", ",")} €</span>
                </span>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11.5, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>
          Seules les offres jugées anormales par l'algorithme sont comparées ici pour l'instant — un tableau avec tous les vendeurs scannés nécessitera une petite évolution du backend.
        </p>
      </section>

      {/* Historique des prix */}
      <section style={{ marginTop: 28 }}>
        <SectionTitle>Historique des prix</SectionTitle>
        <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16 }}>
          <PriceHistoryPanel query={item.name} height={220} />
        </div>
      </section>

      {/* Communauté */}
      <section style={{ marginTop: 28 }}>
        <SectionTitle>💬 Discussion</SectionTitle>
        <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16 }}>
          <CommentsPanel query={item.name} authToken={authToken} onNeedAuth={onNeedAuth} />
        </div>
      </section>

      {/* Deals similaires */}
      {similar && similar.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <SectionTitle>Deals similaires</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {similar.map((it, i) => (
              <DealCard key={i} item={it} authToken={authToken} onNeedAuth={onNeedAuth} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
