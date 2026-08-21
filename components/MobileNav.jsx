// MobileNav.jsx — Barre de navigation fixe en bas d'écran, visible
// uniquement sous le breakpoint mobile (voir la classe CSS .rp-mobile-nav
// dans GlobalStyles, cachée par défaut et affichée en @media max-width:640px).
import { T } from "../theme.js";
import Icon from "./Icon.jsx";

/* Cinq entrées, jamais plus : au-delà, les libellés deviennent illisibles sur
   un écran étroit. Le choix de ces cinq-là suit un principe simple — la barre
   du bas est réservée aux gestes QUOTIDIENS, tout le reste vit dans le menu
   latéral (voir DrawerMenu).

   « Bons plans » a disparu : cet onglet regroupait ce que « Gros deals » et
   « Erreurs de prix » montrent déjà séparément, et occupait une place au prix
   d'un doublon. La place libérée revient à la recherche, jusqu'ici absente de
   la navigation mobile alors que c'est le geste le plus courant sur un site
   de prix. */
const ITEMS = [
  { key: "home", icon: "home", label: "Accueil" },
  // La promesse distinctive du site passe en deuxième position, juste après
  // l'accueil : c'est ce pour quoi on vient.
  { key: "erreurs", icon: "alertCircle", label: "Erreurs" },
  { key: "recherche", icon: "search", label: "Chercher" },
  { key: "favoris", icon: "star", label: "Favoris" },
  { key: "profil", icon: "user", label: "Profil" },
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
