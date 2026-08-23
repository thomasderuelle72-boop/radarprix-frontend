// CodePromo.jsx — Un code de réduction, copiable d'un geste.
//
// Extrait de FeedCard : la page « Deals » en a besoin aussi, et le canal
// d'affiliation publie désormais de vrais codes. Deux copies du même bouton
// auraient divergé à la première retouche.
import { useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";

export default function CodePromo({ code }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Le presse-papiers peut être refusé (contexte non sécurisé, permission
      // navigateur). Le code reste lisible et sélectionnable à l'écran : on
      // n'affiche pas d'erreur pour une action dont le repli est évident.
    }
  };

  return (
    <button
      onClick={copier}
      aria-label={`Copier le code ${code}`}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        borderRadius: T.radiusSm,
        border: `1px dashed ${copie ? T.green : T.purple}`,
        background: copie ? "rgba(53,212,117,.12)" : "rgba(139,92,246,.10)",
        color: copie ? T.green : T.ink,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontWeight: 800, fontSize: 14, letterSpacing: ".06em",
        cursor: "pointer",
      }}
    >
      <Icon name={copie ? "check" : "badgeTag"} size={15} />
      {copie ? "Copié" : code}
    </button>
  );
}
