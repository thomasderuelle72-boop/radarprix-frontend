// FeedCard.jsx — Une entrée du flux unifié, quelle que soit sa nature.
//
// Pourquoi une carte de plus, à côté de DealCard et CommunityDealCard : les
// deux existantes ne savent afficher qu'un prix comparé à une référence.
// Or trois des cinq natures de bons plans ne se lisent pas comme ça.
//
//   • Un code promo n'a pas de prix : il a un CODE à copier, et c'est
//     l'action principale de la carte.
//   • Un produit gratuit n'a pas de remise à afficher : il est gratuit, et
//     c'est tout ce qu'il y a à dire.
//   • Une offre de remboursement laisse le prix inchangé : ce qui compte est
//     le montant remboursé après achat.
//
// Chacune reçoit donc le traitement que sa nature appelle, plutôt qu'un
// gabarit unique qui afficherait « — » dans la moitié des cases.
import { useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import { relativeTime } from "../utils.js";

// Chaque nature a sa couleur et son libellé. Écrits une fois ici : le même
// vocabulaire doit apparaître dans le filtre, sur la carte et dans le badge.
export const NATURES = {
  erreur: { label: "Erreur de prix", couleur: T.red, icone: "alertCircle" },
  gratuit: { label: "Gratuit", couleur: T.green, icone: "gem" },
  code: { label: "Code promo", couleur: T.purple, icone: "badgeTag" },
  odr: { label: "Remboursement", couleur: T.cyan, icone: "refresh" },
  promo: { label: "Promotion", couleur: T.emberSolid, icone: "flame" },
  occasion: { label: "Reconditionné", couleur: T.steel, icone: "refresh" },
  // Une fiche relevée dont le prix n'a rien d'anormal. Le libellé le dit
  // sans emphase : c'est le catalogue, pas une affaire. La teinte neutre
  // évite qu'une carte sans intérêt attire l'œil autant qu'une erreur de prix.
  produit: { label: "Prix relevé", couleur: T.steel, icone: "radar" },
};

/** Combien de temps reste-t-il ? Null si l'offre n'a pas de fin annoncée. */
function tempsRestant(expiresAt) {
  if (!expiresAt) return null;
  const fin = new Date(String(expiresAt).replace(" ", "T") + "Z");
  if (Number.isNaN(fin.getTime())) return null;
  const restantMs = fin.getTime() - Date.now();
  if (restantMs <= 0) return "terminé";
  const heures = Math.floor(restantMs / 3600000);
  if (heures < 1) return `${Math.max(1, Math.floor(restantMs / 60000))} min`;
  if (heures < 48) return `${heures} h`;
  return `${Math.floor(heures / 24)} j`;
}

/** Bouton de copie du code promo — l'action principale de ce type de carte. */
function CodePromo({ code }) {
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

export default function FeedCard({ deal, index = 0 }) {
  const nature = NATURES[deal.type] || NATURES.promo;
  const restant = tempsRestant(deal.expiresAt);
  const termine = restant === "terminé";

  // Un prix de zéro est une information, pas une absence : `deal.price && …`
  // masquerait précisément les offres gratuites, qui sont les plus
  // intéressantes du flux.
  const aUnPrix = Number.isFinite(deal.price);
  const gratuit = aUnPrix && deal.price === 0;

  return (
    <article
      className="fade-up"
      style={{
        display: "flex", flexDirection: "column", gap: 12,
        background: T.gradSurface,
        border: `1px solid ${T.line}`,
        borderRadius: T.radiusLg,
        padding: 16,
        boxShadow: T.shadowCard,
        animationDelay: `${index * 50}ms`,
        opacity: termine ? 0.55 : 1,
      }}
    >
      {/* En-tête : nature du bon plan et compte à rebours */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 999,
            background: `${nature.couleur}1f`, color: nature.couleur,
            fontSize: 11, fontWeight: 800, letterSpacing: ".03em",
          }}
        >
          <Icon name={nature.icone} size={12} />
          {nature.label}
        </span>

        {deal.merchant && (
          <span style={{ fontSize: 12, color: T.sub, fontWeight: 700 }}>{deal.merchant}</span>
        )}

        <span style={{ flex: 1 }} />

        {restant && (
          <span
            style={{
              fontSize: 11, fontWeight: 700,
              color: termine ? T.muted : restant.endsWith("min") ? T.red : T.sub,
            }}
          >
            {termine ? "Terminé" : `Encore ${restant}`}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {deal.imageUrl && (
          <img
            src={deal.imageUrl}
            alt=""
            loading="lazy"
            style={{
              width: 78, height: 78, objectFit: "contain", flexShrink: 0,
              background: T.surface2, borderRadius: T.radiusSm, padding: 6,
            }}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <h3
            style={{
              margin: 0, fontSize: 15, fontWeight: 800, color: T.ink,
              fontFamily: T.fontBody, lineHeight: 1.35,
            }}
          >
            {deal.title}
          </h3>

          {deal.description && (
            <p
              style={{
                margin: 0, fontSize: 12.5, color: T.sub, lineHeight: 1.5,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}
            >
              {deal.description}
            </p>
          )}

          {/* Le prix, ou ce qui en tient lieu selon la nature du bon plan */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginTop: 2 }}>
            {gratuit ? (
              <span style={{ fontSize: 20, fontWeight: 900, color: T.green, fontFamily: T.fontDisplay }}>
                Gratuit
              </span>
            ) : aUnPrix ? (
              <span style={{ fontSize: 20, fontWeight: 900, color: T.ink, fontFamily: T.fontDisplay }}>
                {deal.price.toFixed(2).replace(".", ",")} €
              </span>
            ) : null}

            {/* La référence n'est affichée que si elle a été OBSERVÉE par
                RadarPrix. Une remise seulement annoncée par le marchand n'a
                pas de référence : la montrer comme un prix barré reviendrait
                à relayer son argument commercial pour une mesure. */}
            {Number.isFinite(deal.referencePrice) && deal.referencePrice > (deal.price ?? 0) && (
              <span style={{ fontSize: 13, color: T.muted, textDecoration: "line-through" }}>
                {Math.round(deal.referencePrice)} €
              </span>
            )}

            {Number.isFinite(deal.discountPct) && deal.discountPct > 0 && (
              <span
                style={{
                  padding: "2px 7px", borderRadius: 6,
                  background: `${nature.couleur}22`, color: nature.couleur,
                  fontSize: 12, fontWeight: 900,
                }}
              >
                −{deal.discountPct} %
              </span>
            )}
          </div>

          {deal.voucherCode && (
            <div style={{ marginTop: 4 }}>
              <CodePromo code={deal.voucherCode} />
            </div>
          )}
        </div>
      </div>

      {/* Pied : provenance et lien */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.muted }}>
          {relativeTime(deal.firstSeenAt)}
        </span>

        {/* Le détecteur dit COMMENT le bon plan a été trouvé. C'est une
            information honnête à donner : une anomalie mesurée par RadarPrix
            et une promotion annoncée par un marchand n'ont pas la même
            valeur de preuve. */}
        {deal.detector === "D3" && Number.isFinite(deal.confidence) && (
          <span style={{ fontSize: 11, color: T.muted }}>
            · fiabilité {deal.confidence} %
          </span>
        )}

        <span style={{ flex: 1 }} />

        {deal.url && !termine && (
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: T.radiusSm,
              background: T.ember, color: "#fff",
              fontSize: 13, fontWeight: 800, textDecoration: "none",
            }}
          >
            Voir l'offre
            <Icon name="share" size={13} />
          </a>
        )}
      </div>
    </article>
  );
}
