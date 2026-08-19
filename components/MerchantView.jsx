// MerchantView.jsx — Page dédiée à un marchand : ce que la communauté pense
// de lui, et tout ce que RadarPrix a repéré chez lui en ce moment.
//
// Ne demande aucune nouvelle route au backend : /api/merchants/reliability
// existait déjà mais ne servait qu'à un badge minuscule sur la fiche
// produit, et la liste des deals est filtrée côté client sur le vendeur
// (le backend ne propose pas encore ce filtre, et l'ajouter obligerait à
// recalculer toute l'analyse de prix pour un simple sous-ensemble).
import { useState, useEffect } from "react";
import { T } from "../theme.js";
import { fetchDeals, apiMerchantReliability } from "../api.js";
import PageShell, { EmptyState } from "./PageShell.jsx";
import DealCard, { SkeletonCard } from "./DealCard.jsx";
import MerchantBadge from "./MerchantBadge.jsx";
import Tilt3D from "./Tilt3D.jsx";
import Icon from "./Icon.jsx";

export default function MerchantView({ name, authToken, onNeedAuth, onBack, onOpenDetail }) {
  const [trust, setTrust] = useState(undefined); // undefined = chargement
  const [deals, setDeals] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    apiMerchantReliability(name)
      .then((d) => !cancelled && setTrust(d))
      .catch(() => !cancelled && setTrust(null));
    // 50 = plafond accepté par le backend. Suffisant pour un marchand donné.
    fetchDeals("tout", 1, 50)
      .then((data) => {
        if (cancelled) return;
        const cible = (name || "").trim().toLowerCase();
        setDeals((data.items || []).filter((it) => (it.seller || "").trim().toLowerCase() === cible));
      })
      .catch(() => !cancelled && setDeals(null));
    return () => { cancelled = true; };
  }, [name]);

  const erreurs = deals?.filter((d) => d.verdict === "erreur").length || 0;
  const fiabilite = trust?.reliability;
  const couleurFiabilite = fiabilite == null ? T.sub : fiabilite >= 70 ? T.green : fiabilite >= 40 ? T.yellow : T.red;

  const tuiles = [
    {
      icon: "package",
      color: T.emberSolid,
      valeur: deals === undefined ? null : deals?.length ?? 0,
      libelle: "offre(s) repérée(s) en ce moment",
    },
    {
      icon: "alertCircle",
      color: T.red,
      valeur: deals === undefined ? null : erreurs,
      libelle: "erreur(s) de prix en cours",
    },
    {
      icon: "users",
      color: couleurFiabilite,
      // null quand la communauté n'a jamais voté : on affiche "—" plutôt
      // qu'un score inventé, comme partout ailleurs sur le site.
      valeur: trust === undefined ? null : fiabilite == null ? "—" : `${fiabilite}%`,
      libelle: fiabilite == null ? "pas encore d'avis membres" : "d'avis positifs des membres",
    },
  ];

  return (
    <PageShell
      icon="store"
      iconColor={T.yellow}
      title={name}
      subtitle="Ce que la communauté pense de ce marchand, et tout ce que RadarPrix a repéré chez lui en ce moment."
      onBack={onBack}
      width={1080}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <MerchantBadge name={name} size={46} />
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55 }}>
          {trust?.dealCount > 0
            ? `${trust.dealCount} deal(s) communautaire(s) mentionnent ce marchand.`
            : "Aucun deal communautaire ne mentionne encore ce marchand."}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 32 }}>
        {tuiles.map((t) => (
          <Tilt3D key={t.libelle} max={10} lift={12}>
            <div
              className="rp-gradient-border fade-up"
              style={{
                display: "flex", alignItems: "center", gap: 14,
                background: T.gradSurface, border: `1px solid ${T.line}`,
                borderRadius: T.radiusLg, padding: "17px 20px", boxShadow: T.shadowCard,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${t.color}16`, border: `1px solid ${t.color}3a`,
                  transform: "translateZ(26px)",
                }}
              >
                <Icon name={t.icon} size={20} color={t.color} />
              </span>
              <div style={{ transform: "translateZ(14px)", minWidth: 0 }}>
                <div className="rp-display" style={{ fontSize: 23, fontWeight: 900, color: T.ink, lineHeight: 1.15, minHeight: 28 }}>
                  {t.valeur === null
                    ? <span className="rp-shimmer" style={{ display: "inline-block", width: 42, height: 18, borderRadius: 5 }} />
                    : t.valeur}
                </div>
                <div style={{ fontSize: 11.5, color: T.sub, marginTop: 1 }}>{t.libelle}</div>
              </div>
            </div>
          </Tilt3D>
        ))}
      </div>

      <h3 className="rp-display" style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>
        Offres repérées chez {name}
      </h3>

      {deals === undefined && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {deals && deals.length === 0 && (
        <EmptyState
          icon="store"
          tone={T.yellow}
          title={`Rien de repéré chez ${name} en ce moment`}
          text="Aucune anomalie de prix détectée chez ce marchand pour l'instant. Les scans tournent en continu — ça peut changer d'un jour à l'autre."
        />
      )}

      {deals && deals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {deals.map((it, i) => (
            <DealCard
              key={`${it.name}-${i}`}
              item={it}
              index={i}
              authToken={authToken}
              onNeedAuth={onNeedAuth}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
