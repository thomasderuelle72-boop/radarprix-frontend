// MobileNav.jsx — Barre de navigation fixe en bas d'écran, visible
// uniquement sous le breakpoint mobile (voir la classe CSS .rp-mobile-nav
// dans GlobalStyles, cachée par défaut et affichée en @media max-width:640px).
import { T } from "../theme.js";

const ITEMS = [
  { key: "home", icon: "🏠", label: "Accueil" },
  { key: "deals", icon: "🔥", label: "Deals" },
  { key: "erreurs", icon: "🔴", label: "Alertes" },
  { key: "favoris", icon: "⭐", label: "Favoris" },
  { key: "profil", icon: "👤", label: "Profil" },
];

export default function MobileNav({ active, onNavigate }) {
  return (
    <nav className="rp-mobile-nav" aria-label="Navigation mobile">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          onClick={() => onNavigate(it.key)}
          aria-current={active === it.key ? "page" : undefined}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            flex: 1,
            background: "none",
            border: "none",
            padding: "8px 4px 6px",
            cursor: "pointer",
            color: active === it.key ? T.emberSolid : T.sub,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{it.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 800 }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
