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
import { useId } from "react";
import { T } from "../theme.js";
import { P as TRACES } from "./Icon.jsx";

export const COULEURS_NIVEAU = [T.steel, T.green, T.yellow, T.emberSolid];

/** Couleur d'un niveau, en restant dans les bornes de l'échelle. */
export function couleurNiveau(niveau) {
  return COULEURS_NIVEAU[Math.min(Math.max(niveau, 1), COULEURS_NIVEAU.length) - 1];
}

export default function BadgeHex({ icone, niveau = 1, taille = 52, titre, style }) {
  // useId : deux badges affichés côte à côte ne doivent pas partager la
  // même référence de dégradé, sinon le second reprend la couleur du premier.
  const id = useId().replace(/:/g, "");
  const c = couleurNiveau(niveau);
  const trace = TRACES[icone];

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
      role={titre ? "img" : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : "true"}
      style={{ flexShrink: 0, display: "block", ...style }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity=".30" />
          <stop offset="1" stopColor={c} stopOpacity=".06" />
        </linearGradient>
      </defs>

      <path d="M50 3 92 26.5v47L50 97 8 73.5v-47Z" fill={`url(#${id})`} stroke={c} strokeOpacity=".85" strokeWidth="3" />
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
        Array.from({ length: Math.min(niveau, 4) }, (_, i) => (
          <circle key={i} cx={50 + (i - (Math.min(niveau, 4) - 1) / 2) * 9} cy="82" r="2.4" fill={c} />
        ))}
    </svg>
  );
}
