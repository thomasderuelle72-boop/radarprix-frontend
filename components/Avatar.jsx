// Avatar.jsx — Point de passage unique de tout affichage d'avatar.
//
// Trois formes, dans cet ordre : un avatar de la panoplie maison (jeton
// « rp:renard-braise », voir avatars.jsx), une photo, puis en dernier
// recours l'initiale sur fond coloré.
//
// Tout passe par ici — commentaires, salon, cartes de deal, profils — donc
// ajouter la panoplie à cet endroit suffit à la faire apparaître partout.
import { useState } from "react";
import AvatarMaison, { estAvatarMaison } from "./avatars.jsx";

const AVATAR_COLORS = ["#FF6A1A", "#35D475", "#1F5EFF", "#FFD166", "#FF345D", "#8B5CF6"];

export function colorFor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Avatar({ email, pseudo, avatarUrl, size = 32 }) {
  const label = pseudo || email || "?";
  const initial = label.trim()[0]?.toUpperCase() || "?";
  const [imgFailed, setImgFailed] = useState(false);

  // Un jeton maison n'est pas une adresse : le passer à <img> déclencherait
  // une requête vers « rp:… » et un carré cassé.
  if (estAvatarMaison(avatarUrl)) {
    const dessine = <AvatarMaison jeton={avatarUrl} size={size} titre={label} />;
    // Jeton inconnu — motif retiré du jeu depuis — : on retombe sur l'initiale
    // plutôt que de laisser un trou.
    if (dessine) return dessine;
  }

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={label}
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorFor(label),
        color: "#0C0E14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: size * 0.45,
        fontFamily: "'Unbounded', system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
