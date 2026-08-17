// DealCard.jsx — carte de deal compacte, calquée sur les maquettes fournies :
// photo produit en tête de carte, badge de réduction en médaillon, ligne
// marchand + fraîcheur en bas à gauche, score RadarPrix en bas à droite.
// Toute la carte est cliquable et ouvre la fiche produit ; les actions
// (voir l'offre, historique, discussion) vivent sur cette fiche, pas ici —
// exactement comme dans les maquettes, où les cartes-listes n'ont aucun
// bouton inline.
import { T } from "../theme.js";
import { relativeTime } from "../utils.js";
import MerchantBadge from "./MerchantBadge.jsx";

/* ── Squelette de chargement, même gabarit qu'une carte ─────────── */
export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}
    >
      <div className="rp-shimmer" style={{ height: 120 }} />
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="rp-shimmer" style={{ height: 13, width: "80%", borderRadius: 6 }} />
        <div className="rp-shimmer" style={{ height: 20, width: "45%", borderRadius: 6 }} />
        <div className="rp-shimmer" style={{ height: 11, width: "60%", borderRadius: 6, marginTop: 4 }} />
      </div>
    </div>
  );
}

export default function DealCard({ item, onOpenDetail, variant }) {
  const resolvedVariant = variant || (item.verdict === "erreur" ? "price-error" : "deal");
  const isErr = resolvedVariant === "price-error";
  const isGem = item.score >= 85;
  const seenAgo = relativeTime(item.scraped_at);

  return (
    <button
      onClick={() => onOpenDetail && onOpenDetail(item)}
      className="fade-up rp-deal-card"
      style={{
        width: "100%",
        textAlign: "left",
        cursor: onOpenDetail ? "pointer" : "default",
        background: T.surface,
        border: `1.5px solid ${isErr ? T.pink : T.line}`,
        boxShadow: isGem ? `0 0 20px ${T.yellow}1f` : isErr ? `0 0 16px ${T.pink}14` : "none",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        padding: 0,
      }}
    >
      {isErr && <div className="rp-zigzag" aria-hidden="true" />}

      <div style={{ position: "relative", height: 116, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.img ? (
          <img
            src={item.img}
            alt={item.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{ maxWidth: "70%", maxHeight: "78%", objectFit: "contain" }}
          />
        ) : (
          <span style={{ fontSize: 34, opacity: 0.35 }}>📦</span>
        )}

        {isErr ? (
          <>
            <span style={{ position: "absolute", top: 10, left: 10, background: T.red, color: "#fff", fontFamily: "'Unbounded', system-ui, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "5px 9px", borderRadius: 6 }}>
              ERREUR
            </span>
            {item.pct > 0 && (
              <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,59,48,0.16)", border: `1px solid ${T.red}`, color: T.red, fontSize: 11, fontWeight: 800, padding: "4px 8px", borderRadius: 6 }}>
                −{item.pct}%
              </span>
            )}
          </>
        ) : (
          item.pct > 0 && (
            <span style={{ position: "absolute", top: 10, left: 10, background: T.purple, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 9px", borderRadius: 6 }}>
              −{item.pct}%
            </span>
          )
        )}
      </div>

      <div style={{ padding: "12px 14px 13px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, color: T.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 35 }}>
          {item.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="rp-display" style={{ fontSize: 19, fontWeight: 900, color: isErr ? T.red : T.ink }}>
            {Number(item.price).toFixed(2).replace(".", ",")} €
          </span>
          {item.refPrice > 0 && (
            <span style={{ color: T.sub, textDecoration: "line-through", fontSize: 12.5 }}>
              {Number(item.refPrice).toFixed(0)} €
            </span>
          )}
        </div>

        <div style={{ marginTop: 4, paddingTop: 8, borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {item.seller && <MerchantBadge name={item.seller} size={18} />}
            <span style={{ fontSize: 11, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.seller || "Vendeur inconnu"}{seenAgo ? ` · ${seenAgo}` : ""}
            </span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: T.sub, lineHeight: 1.2 }}>Score RadarPrix</div>
            <div className="rp-display" style={{ fontSize: 12.5, fontWeight: 800, color: isGem ? T.green : T.ink }}>{item.score}/100</div>
          </div>
        </div>
      </div>
    </button>
  );
}
