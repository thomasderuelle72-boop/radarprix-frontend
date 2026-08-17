// MerchantBadge.jsx — pastille "logo" pour un marchand : monogramme coloré
// (pas de vrai logo, images sous droits absentes du projet), même principe
// que l'avatar utilisateur (couleur déterministe par nom).
import { colorFor } from "./Avatar.jsx";

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
        borderRadius: "50%",
        background: colorFor(name),
        color: "#0C0E14",
        fontWeight: 900,
        fontSize: size * 0.5,
        fontFamily: "'Unbounded', system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}
