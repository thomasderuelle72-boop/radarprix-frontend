// DealCard.jsx — Carte de deal façon ticket de caisse (encoches latérales,
// séparateurs pointillés, code-barres décoratif). Extrait de l'ancien
// composant "Sticker" de RadarPrixSite.jsx, avec une prop `variant`
// explicite ("deal" | "price-error") à la place de la logique isErr en dur,
// pour être réutilisable telle quelle sur la homepage (section Pépites,
// nouvelle section Erreurs de prix) et dans la page de résultats.
import { useState } from "react";
import { T } from "../theme.js";
import { PriceHistoryPanel, CommentsPanel } from "./panels.jsx";

// Code à 12 chiffres purement décoratif (pas un vrai EAN), dérivé du nom
// et du prix pour rester stable entre deux rendus de la même carte.
function fakeBarcodeDigits(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const digits = String(h).padStart(12, "0").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/* ── Squelette de chargement, même gabarit qu'une carte-ticket ─── */
export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: T.surface,
        border: `1.5px solid ${T.line}`,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <div className="rp-shimmer" style={{ width: 68, height: 68, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div className="rp-shimmer" style={{ height: 14, width: "72%", borderRadius: 6 }} />
          <div className="rp-shimmer" style={{ height: 24, width: "42%", borderRadius: 6 }} />
          <div className="rp-shimmer" style={{ height: 12, width: "58%", borderRadius: 6 }} />
        </div>
      </div>
      <div className="rp-shimmer" style={{ height: 34, width: "45%", borderRadius: 8 }} />
    </div>
  );
}

/* ── Carte de deal, façon ticket de caisse ─────────────────────── */
export default function DealCard({ item, authToken, onNeedAuth, onOpenDetail, variant }) {
  const resolvedVariant = variant || (item.verdict === "erreur" ? "price-error" : "deal");
  const isErr = resolvedVariant === "price-error";
  const isGem = item.score >= 85;
  const [panel, setPanel] = useState(null); // null | "history" | "comments"

  return (
    <div
      className="fade-up rp-ticket"
      style={{
        background: T.surface,
        border: isGem ? `1.5px solid ${T.yellow}` : `1.5px solid ${isErr ? T.red : T.line}`,
        boxShadow: isGem ? `0 0 24px ${T.yellow}22` : isErr ? `0 0 18px ${T.red}14` : "none",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {isErr && <div className="rp-zigzag" aria-hidden="true" />}
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
            onClick={onOpenDetail ? () => onOpenDetail(item) : undefined}
            style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 10, background: T.surface2, border: `1px solid ${T.line}`, flexShrink: 0, cursor: onOpenDetail ? "pointer" : "default" }}
          />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div
              onClick={onOpenDetail ? () => onOpenDetail(item) : undefined}
              style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.35, color: T.ink, cursor: onOpenDetail ? "pointer" : "default" }}
            >
              {item.name}
            </div>
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
        </div>
      </div>

      <hr className="rp-ticket-sep" />

      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, fontFamily: "'Courier New', monospace" }}>
        {item.seller && <strong style={{ color: T.ink, fontFamily: "'Inter', sans-serif" }}>{item.seller}</strong>}
        {item.seller && " · "}
        référence {Math.round(item.refPrice)} €
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
        {onOpenDetail && (
          <button
            onClick={() => onOpenDetail(item)}
            style={{ padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${T.purple}`, background: "transparent", color: T.purple, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            🔍 Détails
          </button>
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

      <hr className="rp-ticket-sep" />
      <div>
        <div className="rp-barcode" />
        <div style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.12em", color: T.sub, fontFamily: "'Courier New', monospace", marginTop: 4 }}>
          {fakeBarcodeDigits(`${item.name || ""}${item.price || ""}`)}
        </div>
      </div>
    </div>
  );
}
