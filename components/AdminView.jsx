// AdminView.jsx — Tableau de bord d'administration et de modération.
//
// Remplace les quatre blocs écrits en dur dans RadarPrixSite : deux
// compteurs, un bouton de scan, un top 10 et une liste brute d'utilisateurs.
// Le panneau couvre désormais la modération, la santé des services, la
// qualité de détection et l'administration des membres.
//
// Les sections sont réparties en fichiers distincts sous components/admin/ :
// tout garder ici donnerait un fichier de plus de mille lignes, et le
// panneau n'est chargé que par une poignée de personnes — il vit à part du
// bundle principal.
import { useEffect, useState } from "react";
import { T } from "../theme.js";
import { apiModReports } from "../api.js";
import Icon from "./Icon.jsx";
import PageShell from "./PageShell.jsx";
import SectionTableauBord from "./admin/SectionTableauBord.jsx";
import SectionModeration from "./admin/SectionModeration.jsx";
import SectionSante from "./admin/SectionSante.jsx";
import SectionDetection from "./admin/SectionDetection.jsx";
import SectionMembres from "./admin/SectionMembres.jsx";
import SectionFlux from "./admin/SectionFlux.jsx";
import SectionSurveillance from "./admin/SectionSurveillance.jsx";
import SectionMesure from "./admin/SectionMesure.jsx";

const SECTIONS = [
  { id: "accueil", libelle: "Vue d'ensemble", icone: "home" },
  { id: "moderation", libelle: "Modération", icone: "shield", badge: true },
  { id: "flux", libelle: "Flux", icone: "package" },
  { id: "surveillance", libelle: "Surveillance", icone: "search" },
  { id: "mesure", libelle: "Mesure", icone: "scale" },
  { id: "membres", libelle: "Membres", icone: "users" },
  { id: "sante", libelle: "Santé du site", icone: "radar" },
  { id: "detection", libelle: "Détection", icone: "scale", adminSeul: true },
];

export default function AdminView({ token, role, moiId, onBack }) {
  const [section, setSection] = useState("accueil");
  const [signalements, setSignalements] = useState(null);
  const estAdmin = role === "admin";

  // La pastille de l'onglet « Modération » est la raison d'ouvrir ce
  // panneau : elle doit être juste avant qu'on ait cliqué sur l'onglet.
  // Sans ce chargement, elle n'apparaissait qu'une fois la section montée
  // — c'est-à-dire trop tard pour signaler qu'il y a du travail.
  useEffect(() => {
    let annule = false;
    apiModReports(token)
      .then((r) => !annule && setSignalements(r.ouverts))
      .catch(() => {});
    return () => { annule = true; };
  }, [token]);

  // Un modérateur voit la modération et les membres, pas les réglages de
  // l'algorithme ni les exports : le backend refuse déjà ces routes, autant
  // ne pas afficher des boutons qui échoueraient.
  const visibles = SECTIONS.filter((s) => !s.adminSeul || estAdmin);

  return (
    <PageShell
      icon="shield"
      iconColor={T.yellow}
      title={estAdmin ? "Administration" : "Modération"}
      subtitle={
        estAdmin
          ? "Visible par toi seul. Les actions de suppression et de suspension sont définitives et consignées."
          : "Outils de modération. Les réglages de l'algorithme et les exports sont réservés à l'administrateur."
      }
      onBack={onBack}
      width={1080}
      subnav={
        <nav
          className="rp-scroll-x"
          aria-label="Sections d'administration"
          style={{
            display: "flex", gap: 5, overflowX: "auto", marginBottom: 22,
            background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 5,
          }}
        >
          {visibles.map((s) => {
            const actif = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                aria-current={actif ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  flex: 1, minWidth: "max-content", whiteSpace: "nowrap",
                  padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: actif ? T.ember : "transparent",
                  color: actif ? "#0C0E14" : T.sub,
                  fontWeight: actif ? 900 : 700, fontSize: 12.5, fontFamily: "'Inter', sans-serif",
                }}
              >
                <Icon name={s.icone} size={15} />
                {s.libelle}
                {s.badge && signalements > 0 && (
                  <span
                    style={{
                      minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: actif ? "#0C0E14" : T.red, color: actif ? T.emberLight : "#FFF",
                      fontSize: 10.5, fontWeight: 900,
                    }}
                  >
                    {signalements}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      }
    >
      {section === "accueil" && (
        <SectionTableauBord token={token} estAdmin={estAdmin} onOuvrirSection={setSection} />
      )}
      {section === "moderation" && <SectionModeration token={token} onCompteur={setSignalements} />}
      {section === "flux" && <SectionFlux token={token} estAdmin={estAdmin} />}
      {section === "surveillance" && <SectionSurveillance token={token} estAdmin={estAdmin} />}
      {section === "mesure" && <SectionMesure token={token} />}
      {section === "membres" && <SectionMembres token={token} estAdmin={estAdmin} moiId={moiId} />}
      {section === "sante" && <SectionSante token={token} estAdmin={estAdmin} />}
      {section === "detection" && estAdmin && <SectionDetection token={token} estAdmin={estAdmin} />}
    </PageShell>
  );
}
