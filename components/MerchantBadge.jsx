// MerchantBadge.jsx — pastille "logo" pour un marchand : monogramme coloré
// (pas de vrai logo, images sous droits absentes du projet), même principe
// que l'avatar utilisateur (couleur déterministe par nom).
import { colorFor } from "./Avatar.jsx";
import { T } from "../theme.js";

export default function MerchantBadge({ name, size = 20 }) {
  if (!name) return null;
  const initial = name.trim()[0]?.toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: T.ink,
        color: colorFor(name),
        fontWeight: 900,
        fontSize: size * 0.52,
        fontFamily: "'Unbounded', system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}
