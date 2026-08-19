// MobileNav.jsx — Barre de navigation fixe en bas d'écran, visible
// uniquement sous le breakpoint mobile (voir la classe CSS .rp-mobile-nav
// dans GlobalStyles, cachée par défaut et affichée en @media max-width:640px).
import { T } from "../theme.js";
import Icon from "./Icon.jsx";

const ITEMS = [
  { key: "home", icon: "home", label: "Accueil" },
  { key: "deals", icon: "flame", label: "Deals" },
  { key: "erreurs", icon: "alertCircle", label: "Alertes" },
  { key: "favoris", icon: "star", label: "Favoris" },
  // Communauté plutôt que Profil : le profil est déjà accessible par l'avatar
  // en haut à droite, et son menu s'ouvrait tout en haut de l'écran alors
  // qu'on venait d'appuyer tout en bas.
  { key: "communaute", icon: "users", label: "Communauté" },
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
          <Icon name={it.icon} size={19} />
          <span style={{ fontSize: 10, fontWeight: 800 }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
