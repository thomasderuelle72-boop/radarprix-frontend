// MobileNav.jsx — Barre de navigation fixe en bas d'écran, visible
// uniquement sous le breakpoint mobile (voir la classe CSS .rp-mobile-nav
// dans GlobalStyles, cachée par défaut et affichée en @media max-width:640px).
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import useRadar from "./useRadar.js";
import useActivite from "./useActivite.js";

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
  { key: "erreurs", icon: "alertCircle", label: "Erreurs", compteur: "anomalies" },
  { key: "recherche", icon: "search", label: "Chercher" },
  // « Activité » plutôt que « Favoris » : les favoris se consultent quand on
  // en a le temps et vivent très bien dans le menu, alors qu'un message ou une
  // réponse appellent une réaction. La barre du bas est faite pour ce qui
  // réclame l'attention maintenant.
  { key: "activite", icon: "bell", label: "Activité", compteur: "activite" },
  { key: "profil", icon: "user", label: "Profil" },
];

export default function MobileNav({ active, onNavigate, token }) {
  /* Une barre de navigation ordinaire est une table des matières. Celle-ci
     est un instrument : elle dit ce que le radar a trouvé À CET INSTANT.
     Une erreur de prix vit vingt minutes — une navigation qui ne sait pas
     annoncer « il y en a trois, maintenant » rate le seul argument du site. */
  const radar = useRadar();
  const activite = useActivite(token);

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
            <Icon name={it.icon} size={19} />
            {/* Pastille de compte. Elle n'apparaît qu'à partir de un : un
                « 0 » attirerait l'œil pour annoncer qu'il n'y a rien. */}
            {it.compteur && (it.compteur === "activite" ? activite.total : radar?.[it.compteur]) > 0 && (
              <span
                className="rp-nav-pastille"
                aria-label={`${it.compteur === "activite" ? activite.total : radar[it.compteur]} en attente`}
                style={{
                  position: "absolute",
                  top: -5,
                  left: "calc(50% + 4px)",
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 999,
                  background: it.compteur === "activite" ? T.emberSolid : T.red,
                  color: "#fff",
                  fontSize: 9.5,
                  fontWeight: 900,
                  lineHeight: "16px",
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {(() => {
                  const n = it.compteur === "activite" ? activite.total : radar[it.compteur];
                  return n > 99 ? "99+" : n;
                })()}
              </span>
            )}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800 }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
