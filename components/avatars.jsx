// avatars.jsx — La panoplie d'avatars du site.
//
// Pourquoi un jeu maison plutôt que des images : `avatar_url` est renvoyé
// avec CHAQUE commentaire, message de salon, carte de deal et profil. Une
// image intégrée y pèserait un à trois kilo-octets, répétés cent fois dans
// une page de salon. On stocke donc un jeton — « rp:renard-braise » — et le
// dessin est reconstitué à l'affichage. Neuf octets par occurrence.
//
// Un motif × une couleur : douze silhouettes et six teintes donnent
// soixante-douze avatars distincts pour le prix de douze dessins. C'est ce
// qui permet à deux membres qui aiment le renard de ne pas se ressembler.
//
// Les dessins sont des silhouettes pleines, pas des traits comme Icon.jsx :
// à 24 px dans un fil de commentaires, une ligne de 1,75 px disparaît, alors
// qu'une forme pleine se reconnaît encore.
/* ── Teintes ───────────────────────────────────────────────────────
   Tirées de la charte, jamais inventées. Le glyphe est toujours sombre
   sur fond coloré : c'est le contraste que le site utilise déjà pour ses
   boutons braise, et il reste lisible à toutes les tailles. */
export const PALETTES = [
  { cle: "braise", nom: "Braise", fond: "#FF6A1A" },
  { cle: "menthe", nom: "Menthe", fond: "#2FD98B" },
  { cle: "azur", nom: "Azur", fond: "#3B7BFF" },
  { cle: "or", nom: "Or", fond: "#FFC24D" },
  { cle: "grenat", nom: "Grenat", fond: "#FF456B" },
  { cle: "violet", nom: "Violet", fond: "#9B72F7" },
];

// Couleur du glyphe et des yeux : le même bleu-nuit que le fond du site,
// pour que l'avatar paraisse découpé dedans plutôt que posé dessus.
const ENCRE = "#0C0E14";

/* ── Motifs ────────────────────────────────────────────────────────
   Huit animaux et quatre emblèmes du site. Les animaux sont dessinés de
   face : un profil demande beaucoup plus de détail pour rester
   reconnaissable une fois réduit.

   Chaque motif reçoit l'encre (`e`) et le fond (`f`) — le fond sert à
   creuser les yeux dans la silhouette, ce qui donne le regard sans
   ajouter de troisième couleur. */
export const MOTIFS = [
  {
    cle: "renard",
    nom: "Renard",
    dessin: (e, f) => (
      <>
        {/* Les oreilles partent du crâne au lieu de flotter au-dessus :
            détachées, elles se lisaient comme une couronne. */}
        <path d="M4.5 3.2 10.4 6.6 5.6 11.2Z" fill={e} />
        <path d="M19.5 3.2 13.6 6.6 18.4 11.2Z" fill={e} />
        <path d="M12 5.8c4.6 0 8.1 2.1 8.1 5.1 0 3.9-3.6 8.2-8.1 10.9-4.5-2.7-8.1-7-8.1-10.9 0-3 3.5-5.1 8.1-5.1Z" fill={e} />
        {/* Joues claires : c'est ce qui distingue un renard d'un chien. */}
        <path d="M12 21.8c-2.4-1.4-4.5-3.4-5.9-5.5 1.7-.5 3.6-.2 5.9 1 2.3-1.2 4.2-1.5 5.9-1-1.4 2.1-3.5 4.1-5.9 5.5Z" fill={f} />
        <circle cx="8.7" cy="11.2" r="1.3" fill={f} />
        <circle cx="15.3" cy="11.2" r="1.3" fill={f} />
        <path d="M12 15.1c.9 0 1.5.5 1.5 1.1 0 .7-.7 1.3-1.5 1.3s-1.5-.6-1.5-1.3c0-.6.6-1.1 1.5-1.1Z" fill={e} />
      </>
    ),
  },
  {
    cle: "hibou",
    nom: "Hibou",
    dessin: (e, f) => (
      <>
        <path d="M4.4 3.4 8.6 6.1 5.2 8.2Z" fill={e} />
        <path d="M19.6 3.4 15.4 6.1 18.8 8.2Z" fill={e} />
        <path d="M12 4.4c4.7 0 8.3 3.4 8.3 8.1 0 5-3.7 8.7-8.3 8.7s-8.3-3.7-8.3-8.7c0-4.7 3.6-8.1 8.3-8.1Z" fill={e} />
        <circle cx="8.5" cy="11.4" r="3" fill={f} />
        <circle cx="15.5" cy="11.4" r="3" fill={f} />
        <circle cx="8.5" cy="11.4" r="1.35" fill={e} />
        <circle cx="15.5" cy="11.4" r="1.35" fill={e} />
        <path d="M12 14.2 13.4 16.6 10.6 16.6Z" fill={f} />
      </>
    ),
  },
  {
    cle: "chat",
    nom: "Chat",
    dessin: (e, f) => (
      <>
        <path d="M4.2 3.8 8.8 6.4 5.4 9.6Z" fill={e} />
        <path d="M19.8 3.8 15.2 6.4 18.6 9.6Z" fill={e} />
        <path d="M12 5.6c4.6 0 8 2.9 8 7.2 0 4.6-3.5 8-8 8s-8-3.4-8-8c0-4.3 3.4-7.2 8-7.2Z" fill={e} />
        <circle cx="8.9" cy="12" r="1.3" fill={f} />
        <circle cx="15.1" cy="12" r="1.3" fill={f} />
        <path d="M10.4 15.6h3.2L12 17.4Z" fill={f} />
        <rect x="2.6" y="13.1" width="4.2" height="1.15" rx=".58" fill={e} />
        <rect x="17.2" y="13.1" width="4.2" height="1.15" rx=".58" fill={e} />
      </>
    ),
  },
  {
    cle: "ours",
    nom: "Ours",
    dessin: (e, f) => (
      <>
        <circle cx="5.9" cy="6.4" r="2.9" fill={e} />
        <circle cx="18.1" cy="6.4" r="2.9" fill={e} />
        <path d="M12 5.2c4.6 0 8.1 3.3 8.1 7.9s-3.5 7.9-8.1 7.9-8.1-3.3-8.1-7.9S7.4 5.2 12 5.2Z" fill={e} />
        <circle cx="9.1" cy="11.6" r="1.2" fill={f} />
        <circle cx="14.9" cy="11.6" r="1.2" fill={f} />
        <ellipse cx="12" cy="16" rx="3.4" ry="2.5" fill={f} />
        <ellipse cx="12" cy="14.9" rx="1.25" ry="1" fill={e} />
      </>
    ),
  },
  {
    cle: "lapin",
    nom: "Lapin",
    dessin: (e, f) => (
      <>
        <ellipse cx="8.7" cy="6.1" rx="1.85" ry="4.9" fill={e} />
        <ellipse cx="15.3" cy="6.1" rx="1.85" ry="4.9" fill={e} />
        <path d="M12 9.4c4.2 0 7.3 2.7 7.3 6.1s-3.1 5.9-7.3 5.9-7.3-2.5-7.3-5.9 3.1-6.1 7.3-6.1Z" fill={e} />
        <circle cx="9.3" cy="14.4" r="1.2" fill={f} />
        <circle cx="14.7" cy="14.4" r="1.2" fill={f} />
        <path d="M10.7 17.4h2.6L12 19Z" fill={f} />
      </>
    ),
  },
  {
    cle: "loupe",
    nom: "Loupe",
    dessin: (e, f) => (
      <>
        <circle cx="10.4" cy="10.2" r="7.4" fill={e} />
        <circle cx="10.4" cy="10.2" r="4.6" fill={f} />
        {/* Le reflet en biais : sans lui, la lentille se lit comme un anneau. */}
        <path d="M7.4 7.4a4.4 4.4 0 0 1 3.4-1.6" stroke={e} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".55" />
        <rect x="14.7" y="15.1" width="6.9" height="3.5" rx="1.75" transform="rotate(42 14.7 15.1)" fill={e} />
      </>
    ),
  },
  {
    cle: "abeille",
    nom: "Abeille",
    dessin: (e, f) => (
      <>
        <ellipse cx="6.6" cy="8.2" rx="3.4" ry="2.2" transform="rotate(-28 6.6 8.2)" fill={e} opacity=".55" />
        <ellipse cx="17.4" cy="8.2" rx="3.4" ry="2.2" transform="rotate(28 17.4 8.2)" fill={e} opacity=".55" />
        <path d="M12 5.4c3.2 0 5.6 2.9 5.6 7 0 4.8-2.5 8.2-5.6 8.2S6.4 17.2 6.4 12.4c0-4.1 2.4-7 5.6-7Z" fill={e} />
        <rect x="6.9" y="11.4" width="10.2" height="1.7" rx=".85" fill={f} />
        <rect x="7.6" y="15" width="8.8" height="1.7" rx=".85" fill={f} />
        <circle cx="10.1" cy="8.6" r="1.05" fill={f} />
        <circle cx="13.9" cy="8.6" r="1.05" fill={f} />
      </>
    ),
  },
  {
    cle: "grenouille",
    nom: "Grenouille",
    dessin: (e, f) => (
      <>
        <circle cx="7.2" cy="7.4" r="3.5" fill={e} />
        <circle cx="16.8" cy="7.4" r="3.5" fill={e} />
        <circle cx="7.2" cy="7.4" r="1.7" fill={f} />
        <circle cx="16.8" cy="7.4" r="1.7" fill={f} />
        <circle cx="7.2" cy="7.4" r=".8" fill={e} />
        <circle cx="16.8" cy="7.4" r=".8" fill={e} />
        <path d="M12 9c4.5 0 8 2.6 8 6s-3.5 5.9-8 5.9S4 18.4 4 15s3.5-6 8-6Z" fill={e} />
        <path d="M8.2 16.4c1.1 1.5 2.4 2.2 3.8 2.2s2.7-.7 3.8-2.2" stroke={f} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    cle: "radar",
    nom: "Radar",
    dessin: (e) => (
      <>
        {/* Anneaux tracés sur le fond plutôt qu'un disque plein : la version
            pleine donnait une pastille sombre où rien ne se distinguait. */}
        <circle cx="12" cy="12" r="9.2" fill="none" stroke={e} strokeWidth="1.6" />
        <circle cx="12" cy="12" r="6" fill="none" stroke={e} strokeWidth="1.4" opacity=".62" />
        <circle cx="12" cy="12" r="2.9" fill="none" stroke={e} strokeWidth="1.4" opacity=".62" />
        <path d="M12 12 12 2.8A9.2 9.2 0 0 1 20.2 7.8Z" fill={e} opacity=".3" />
        <path d="M12 12 19.6 7.4" stroke={e} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16.4" cy="15.6" r="2" fill={e} />
      </>
    ),
  },
  {
    cle: "flamme",
    nom: "Flamme",
    dessin: (e) => (
      <>
        <path d="M12.6 2.2c.7 3.3 2.5 5.2 4.5 6.9 2 1.7 3.1 3.7 3.1 6a8.2 8.2 0 1 1-16.4 0c0-1.4.5-2.6 1.3-3.6a3 3 0 0 0 3 3 3 3 0 0 0 3-3c0-1.6-.6-2.4-1.2-3.4-1.1-2.4-.2-4.5 2.7-5.9Z" fill={e} />
      </>
    ),
  },
  {
    cle: "eclair",
    nom: "Éclair",
    dessin: (e) => <path d="M13.9 1.8 5.2 13.4h5.1l-1.2 8.8 9-12.1h-5.3Z" fill={e} />,
  },
  {
    cle: "pepite",
    nom: "Pépite",
    dessin: (e, f) => (
      <>
        <path d="M7.2 3.4h9.6l4.6 6.2L12 21.6 2.6 9.6Z" fill={e} />
        {/* Facettes tracées au fond, pas remplies en demi-opacité : le
            mélange donnait une masse trouble une fois réduite. */}
        <path d="M2.6 9.6h18.8M7.2 3.4 9.5 9.6 12 21.6 14.5 9.6 16.8 3.4"
          stroke={f} strokeWidth="1.15" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
];

const PAR_CLE = new Map(MOTIFS.map((m) => [m.cle, m]));
const PALETTE_PAR_CLE = new Map(PALETTES.map((p) => [p.cle, p]));

/** Forme d'un jeton d'avatar maison : rp:<motif>-<teinte>. */
const JETON = /^rp:([a-z]+)-([a-z]+)$/;

export const jetonAvatar = (motif, palette) => `rp:${motif}-${palette}`;

/** Reconnaît un jeton maison, sans se prononcer sur sa validité. */
export function estAvatarMaison(valeur) {
  return typeof valeur === "string" && valeur.startsWith("rp:");
}

/**
 * Décompose un jeton. Renvoie null si le motif ou la teinte n'existe pas —
 * un avatar retiré du jeu ne doit pas casser l'affichage d'un vieux profil,
 * il retombe simplement sur l'initiale colorée.
 */
export function lireJeton(valeur) {
  const m = JETON.exec(valeur || "");
  if (!m) return null;
  const motif = PAR_CLE.get(m[1]);
  const palette = PALETTE_PAR_CLE.get(m[2]);
  return motif && palette ? { motif, palette } : null;
}

/** Rendu d'un avatar maison. `titre` alimente l'infobulle et l'accessibilité. */
export default function AvatarMaison({ jeton, size = 32, titre }) {
  const lu = lireJeton(jeton);
  if (!lu) return null;
  const { motif, palette } = lu;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={titre || motif.nom}
      style={{ display: "block", borderRadius: "50%", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="12" fill={palette.fond} />
      {/* Reflet très doux en haut à gauche : sans lui, la pastille paraît
          plate à côté des cartes du site, qui ont toutes un dégradé. */}
      <circle cx="8.4" cy="7.6" r="9.6" fill="#FFF" opacity=".13" />
      <g transform="translate(2.4 2.4) scale(0.8)">{motif.dessin(ENCRE, palette.fond)}</g>
    </svg>
  );
}

/** Avatar proposé par défaut : dépend du pseudo, donc stable et varié. */
export function avatarParDefaut(graine) {
  let h = 0;
  for (let i = 0; i < (graine || "").length; i++) h = graine.charCodeAt(i) + ((h << 5) - h);
  h = Math.abs(h);
  return jetonAvatar(MOTIFS[h % MOTIFS.length].cle, PALETTES[(h >> 3) % PALETTES.length].cle);
}
