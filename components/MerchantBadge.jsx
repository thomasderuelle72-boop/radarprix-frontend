// MerchantBadge.jsx — le logo d'un marchand, monogramme en repli.
//
// L'initiale seule ne dit rien : « A » peut être Amazon, Auchan, Aldi ou
// Alinéa, et une grille de cartes devient illisible. Le logo se reconnaît
// avant même d'avoir lu le nom.
//
// D'où vient l'image : du service d'icônes de DuckDuckGo, qui sert le
// favicon d'un domaine sans clé ni compte. Vérifié sur les enseignes du
// registre — Amazon, Boulanger, Fnac, LDLC, Decathlon, Cdiscount,
// JouéClub… toutes répondent.
//
// Le monogramme reste en repli, et il sert aussi de premier rendu : une
// image qui met du temps à venir ne doit pas laisser un trou dans la carte.
import { useState } from "react";
import { colorFor } from "./Avatar.jsx";
import { T } from "../theme.js";

const logoDe = (domaine) =>
  domaine ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domaine)}.ico` : null;

export default function MerchantBadge({ name, domaine, size = 20 }) {
  // Un logo qui a échoué ne doit pas être redemandé à chaque rendu.
  const [echoue, setEchoue] = useState(false);
  if (!name) return null;

  const initial = name.trim()[0]?.toUpperCase() || "?";
  const url = echoue ? null : logoDe(domaine);

  const cadre = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: size * 0.28,
    flexShrink: 0,
    overflow: "hidden",
  };

  if (url) {
    return (
      <span aria-hidden="true" style={{ ...cadre, background: "#FFF" }}>
        <img
          src={url}
          alt=""
          loading="lazy"
          width={size}
          height={size}
          onError={() => setEchoue(true)}
          style={{ width: "82%", height: "82%", objectFit: "contain" }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...cadre,
        background: T.ink,
        color: colorFor(name),
        fontWeight: 900,
        fontSize: size * 0.52,
        fontFamily: "'Unbounded', system-ui, sans-serif",
      }}
    >
      {initial}
    </span>
  );
}
