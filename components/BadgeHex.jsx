// BadgeHex.jsx — Une distinction, dessinée en hexagone gravé.
//
// La première version employait un `clipPath` CSS sur un carré coloré :
// aux petites tailles la forme se lisait comme un cercle, et l'icône
// paraissait délavée faute de contraste. Ici tout est en SVG — dégradé
// intérieur, contour extérieur franc, contour intérieur gravé, pastilles
// de niveau — ce qui reste net à toutes les tailles.
//
// Le niveau se lit d'abord à la couleur : acier (débuts), vert, or, puis
// l'orange de la marque pour le plus haut échelon. L'ancienne échelle
// (violet → orange → jaune → vert) ne décrivait aucune progression.
//
// Le relief et les animations vivent en CSS (voir le bloc "Badges" des
// styles globaux) : reflet qui balaie l'hexagone au survol, pastilles qui
// se posent l'une après l'autre, halo qui respire sur le dernier échelon.
// Rien n'est animé en JavaScript, et tout s'éteint sous
// prefers-reduced-motion.
import { useId } from "react";
import { T } from "../theme.js";
import { P as TRACES } from "./Icon.jsx";

export const COULEURS_NIVEAU = [T.steel, T.green, T.yellow, T.emberSolid];

/** Couleur d'un niveau, en restant dans les bornes de l'échelle. */
export function couleurNiveau(niveau) {
  return COULEURS_NIVEAU[Math.min(Math.max(niveau, 1), COULEURS_NIVEAU.length) - 1];
}

const HEXAGONE = "M50 3 92 26.5v47L50 97 8 73.5v-47Z";

export default function BadgeHex({ icone, niveau = 1, taille = 52, titre, anime = true, style }) {
  // useId : deux badges affichés côte à côte ne doivent pas partager la
  // même référence de dégradé, sinon le second reprend la couleur du premier.
  const id = useId().replace(/:/g, "");
  const c = couleurNiveau(niveau);
  const trace = TRACES[icone];
  const pastilles = Math.min(niveau, COULEURS_NIVEAU.length);
  // Le halo n'apparaît qu'au dernier échelon — celui qui porte l'orange de
  // la marque. Sur tous les niveaux, un profil bien rempli clignoterait.
  const dernierEchelon = niveau >= COULEURS_NIVEAU.length;

  // L'icône est dessinée sur une grille 24 ; on la pose au centre des 100
  // du badge, légèrement remontée pour laisser la place aux pastilles.
  const cote = 44;
  const echelle = cote / 24;
  const marge = (100 - cote) / 2;

  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 100 100"
      className="rp-badge-hex"
      role={titre ? "img" : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : "true"}
      // Lue par le CSS pour teinter l'ombre portée au survol : elle doit
      // reprendre la couleur de l'échelon, que seul ce composant connaît.
      style={{ flexShrink: 0, display: "block", "--badge-glow": `${c}66`, ...style }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity=".30" />
          <stop offset="1" stopColor={c} stopOpacity=".06" />
        </linearGradient>
        <linearGradient id={`${id}refl`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".38" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <path d={HEXAGONE} />
        </clipPath>
        {/* Le halo doit se lire comme une lueur, pas comme un second
            contour : un trait épais non flouté donnait une double bordure. */}
        <filter id={`${id}halo`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {dernierEchelon && anime && (
        <path
          className="rp-badge-aura"
          d={HEXAGONE}
          fill="none"
          stroke={c}
          strokeWidth="6"
          filter={`url(#${id}halo)`}
          opacity=".3"
        />
      )}

      <path d={HEXAGONE} fill={`url(#${id})`} stroke={c} strokeOpacity=".85" strokeWidth="3" />
      <path d="M50 12 84 31v38L50 88 16 69V31Z" fill="none" stroke={c} strokeOpacity=".22" strokeWidth="1.5" />

      {trace && (
        <g
          transform={`translate(${marge} ${marge - 3}) scale(${echelle})`}
          fill="none"
          stroke={c}
          color={c}
          strokeWidth={1.9 / echelle}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {trace}
        </g>
      )}

      {/* Pastilles de niveau : au premier échelon il n'y en a pas — une
          seule pastille se lirait comme une poussière plutôt que comme
          une information. */}
      {niveau > 1 &&
        Array.from({ length: pastilles }, (_, i) => (
          <circle
            key={i}
            className={anime ? "rp-badge-pip" : undefined}
            style={anime ? { animationDelay: `${260 + i * 90}ms` } : undefined}
            cx={50 + (i - (pastilles - 1) / 2) * 9}
            cy="82"
            r="2.4"
            fill={c}
          />
        ))}

      {/* Reflet balayant, découpé à la forme de l'hexagone. Posé en dernier
          pour passer au-dessus de l'icône, comme une vraie réflexion. */}
      {anime && (
        <g clipPath={`url(#${id}clip)`} pointerEvents="none">
          <g transform="skewX(-16)">
            <rect className="rp-badge-shine" x="0" y="-25" width="24" height="160" fill={`url(#${id}refl)`} />
          </g>
        </g>
      )}
    </svg>
  );
}
