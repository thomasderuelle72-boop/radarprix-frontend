// MobileNav.jsx — Barre de navigation fixe en bas d'écran, visible
// uniquement sous le breakpoint mobile (voir la classe CSS .rp-mobile-nav
// dans GlobalStyles, cachée par défaut et affichée en @media max-width:640px).
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";

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
  /* « Deals » prend la deuxième place, occupée jusqu'ici par « Erreurs ».
     Deux raisons. La page des erreurs de prix est vide — le site n'en
     détecte aucune aujourd'hui, et un onglet permanent vers une page vide
     est la pire promesse qu'une navigation puisse faire. Et les deals sont
     le contenu réel du site : c'est là qu'il faut mener. */
  { key: "deals", icon: "flame", label: "Deals" },
  { key: "recherche", icon: "search", label: "Chercher" },
  /* La communauté remplace les favoris. Un favori se consulte de temps en
     temps ; la communauté se visite. Elle reste accessible depuis le menu
     latéral et le pied de page, comme les erreurs de prix. */
  { key: "communaute", icon: "users", label: "Communauté" },
  // L'avatar remplace l'icône quand le membre est connecté : c'est son
  // compte, pas une silhouette générique. Voir `vignette` plus bas.
  { key: "profil", icon: "user", label: "Profil", avatar: true },
];

export default function MobileNav({ active, onNavigate, utilisateur }) {
  /* La barre interrogeait le radar toutes les quatre-vingt-dix secondes pour
     poser une pastille sur l'onglet « Erreurs ». Cet onglet a disparu, et
     aucun de ceux qui restent ne mérite de pastille : le radar ne publie que
     des totaux, et un « 27 » rouge en permanence n'est pas un compteur, c'est
     du bruit. Une pastille annonce du NOUVEAU, ou elle ne sert à rien.

     L'appel périodique est donc retiré plutôt que laissé à tourner pour un
     affichage qui n'existe plus. */
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
          <span style={{ position: "relative", display: "flex" }}>
            {it.avatar && utilisateur ? (
              /* Cercle de 21 px : l'avatar occupe la place de l'icône sans
                 décaler les libellés des quatre autres entrées. L'anneau
                 marque l'onglet courant, puisqu'une image ne peut pas
                 changer de couleur comme un trait. */
              <span
                style={{
                  display: "flex", borderRadius: "50%", padding: 1.5,
                  border: `1.5px solid ${active === it.key ? T.emberSolid : "transparent"}`,
                  margin: -3,
                }}
              >
                <Avatar
                  email={utilisateur.email}
                  pseudo={utilisateur.pseudo}
                  avatarUrl={utilisateur.avatar_url}
                  size={21}
                />
              </span>
            ) : (
              <Icon name={it.icon} size={19} />
            )}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800 }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
