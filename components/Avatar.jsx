// Avatar.jsx — photo si dispo, sinon initiale colorée (déterministe).
// Extrait de RadarPrixSite.jsx pour être réutilisable par les composants
// de fil de commentaires (panels.jsx) sans dupliquer la logique.
import { useState } from "react";

const AVATAR_COLORS = ["#FF6A35", "#2FD98B", "#1F5EFF", "#FFC53D", "#FF3B30", "#A855F7"];

export function colorFor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Avatar({ email, pseudo, avatarUrl, size = 32 }) {
  const label = pseudo || email || "?";
  const initial = label.trim()[0]?.toUpperCase() || "?";
  const [imgFailed, setImgFailed] = useState(false);
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
