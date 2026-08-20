// PageShell.jsx — Gabarit commun aux vues secondaires (Favoris, Communauté,
// Forum, Chat, Marchand…).
//
// Pourquoi : la page d'accueil a reçu un traitement visuel complet (fonds
// aurora, titres travaillés, cartes en relief) que les autres vues n'ont
// jamais eu. On passait d'un univers graphique à l'autre en changeant
// d'onglet. Ce composant leur donne le même en-tête, la même largeur et le
// même fond, sans dupliquer ces réglages dans chaque vue.
import { T } from "../theme.js";
import Icon from "./Icon.jsx";

export default function PageShell({
  icon,
  iconColor = T.emberSolid,
  title,
  subtitle,
  action,
  onBack,
  backLabel = "Accueil",
  width = 900,
  subnav,
  children,
}) {
  return (
    <div style={{ position: "relative", overflow: "hidden", minHeight: "62vh" }}>
      {/* Même nappe de couleur diffuse que la page d'accueil, en plus discret :
          elle doit habiller le haut de page sans concurrencer le contenu. */}
      <div className="rp-aurora" aria-hidden="true" style={{ opacity: 0.4, height: 420 }}>
        <span style={{ top: "-58%", left: "12%", width: 460, height: 400, background: `${iconColor}2e` }} />
        <span style={{ top: "-42%", right: "10%", width: 420, height: 360, background: "rgba(139,92,246,.20)", animationDelay: "-8s" }} />
      </div>

      <main style={{ position: "relative", zIndex: 1, maxWidth: width, margin: "0 auto", padding: "20px 16px 64px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", color: T.sub, fontWeight: 700,
              fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ← {backLabel}
          </button>
        )}

        {/* Certaines vues portent déjà leur propre titre dans le contenu (le
            profil d'un membre affiche son nom sous sa photo) : répéter
            l'en-tête donnerait le nom deux fois de suite. */}
        {title && (
        <div
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            gap: 14, flexWrap: "wrap", marginBottom: subtitle ? 10 : 22,
          }}
        >
          <h2
            className="rp-display"
            style={{
              display: "flex", alignItems: "center", gap: 11,
              fontSize: "clamp(20px, 2.7vw, 27px)", fontWeight: 900,
              letterSpacing: "-0.01em", minWidth: 0,
            }}
          >
            {icon && (
              <span
                aria-hidden="true"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `${iconColor}16`, border: `1px solid ${iconColor}3a`,
                }}
              >
                <Icon name={icon} size={21} color={iconColor} />
              </span>
            )}
            {title}
          </h2>
          {action}
        </div>
        )}

        {subtitle && (
          <p style={{ color: T.sub, fontSize: 14, lineHeight: 1.6, marginBottom: 24, maxWidth: 620 }}>
            {subtitle}
          </p>
        )}

        {/* Sous-navigation éventuelle (espace communauté) : placée sous le
            titre, elle reste visible quelle que soit la sous-page ouverte. */}
        {subnav}

        {children}
      </main>
    </div>
  );
}

/**
 * État vide commun à ces vues. Jusqu'ici chacune affichait au mieux une
 * ligne de texte perdue au milieu d'une page vide, au pire rien du tout.
 */
export function EmptyState({ icon = "radar", tone = T.emberSolid, title, text, action }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        gap: 12, padding: "48px 24px",
        background: T.gradSurface, border: `1px dashed ${T.line}`, borderRadius: T.radiusLg,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: "50%",
          background: `${tone}14`, border: `1px solid ${tone}3a`,
        }}
      >
        <Icon name={icon} size={26} color={tone} />
      </span>
      <h3 className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink }}>{title}</h3>
      <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 420 }}>{text}</p>
      {action}
    </div>
  );
}
