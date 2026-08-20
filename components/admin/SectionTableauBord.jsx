// SectionTableauBord.jsx — Vue d'ensemble : chiffres qui appellent une
// action, courbes sur 30 jours, scan manuel et exports.
//
// Les deux compteurs d'origine (inscrits, scans) ne disaient rien de ce
// qu'il y avait à faire ni d'une tendance.
import { useState, useEffect } from "react";
import { T } from "../../theme.js";
import Icon from "../Icon.jsx";
import { apiAdminStats, apiAdminTriggerScan, apiAdminActivity, apiAdminExport } from "../../api.js";
import { nombreLisible } from "../../utils.js";
import { carte, Titre, Chiffre, Tableau, cellule, Rien, boutonPrimaire, boutonSecondaire, champ } from "./ui.jsx";

export default function SectionTableauBord({ token, estAdmin, onOuvrirSection }) {
  const [stats, setStats] = useState(null);
  const [activite, setActivite] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [scanEnCours, setScanEnCours] = useState(false);
  const [resultatScan, setResultatScan] = useState(null);
  const [taille, setTaille] = useState(10);

  useEffect(() => {
    apiAdminStats(token).then(setStats).catch((e) => setErreur(e.message));
    apiAdminActivity(token, 30).then(setActivite).catch(() => setActivite(null));
  }, [token]);

  const lancerScan = async () => {
    setScanEnCours(true);
    setErreur(null);
    setResultatScan(null);
    try {
      const d = await apiAdminTriggerScan(token, taille);
      setResultatScan(d);
      apiAdminStats(token).then(setStats).catch(() => {});
    } catch (e) {
      setErreur(e.message);
    } finally {
      setScanEnCours(false);
    }
  };

  return (
    <>
      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 12 }}>{erreur}</p>}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <Chiffre valeur={nombreLisible(stats?.totalUsers ?? "—")} libelle="membres inscrits" icone="users" />
        <Chiffre
          valeur={nombreLisible(stats?.membresActifs30j ?? "—")}
          libelle="actifs sur 30 jours"
          icone="flame"
          ton={T.green}
        />
        <Chiffre
          valeur={nombreLisible(stats?.signalementsOuverts ?? "—")}
          libelle="signalements en attente"
          icone="alertTriangle"
          ton={stats?.signalementsOuverts > 0 ? T.red : undefined}
        />
        <Chiffre valeur={nombreLisible(stats?.totalScans ?? "—")} libelle="offres enregistrées" icone="radar" />
      </div>

      {stats?.signalementsOuverts > 0 && (
        <button
          onClick={() => onOuvrirSection("moderation")}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            background: "rgba(255,52,93,.08)", border: `1px solid ${T.red}44`,
            borderRadius: T.radiusMd, padding: "13px 16px", marginBottom: 16, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Icon name="alertTriangle" size={17} color={T.red} />
          <span style={{ fontSize: 13, color: T.ink, fontWeight: 700 }}>
            {stats.signalementsOuverts} signalement(s) attendent une décision
          </span>
          <Icon name="chevronDown" size={15} color={T.red} style={{ marginLeft: "auto", transform: "rotate(-90deg)" }} />
        </button>
      )}

      {activite && <Courbes activite={activite} />}

      {estAdmin && (
        <div style={carte}>
          <Titre aide="Chaque produit scanné consomme une requête du quota mensuel. Deux lancements par quart d'heure sont autorisés.">
            Scan manuel
          </Titre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={taille} onChange={(e) => setTaille(Number(e.target.value))} style={{ ...champ, flex: "0 0 150px" }}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} produits</option>)}
            </select>
            <button onClick={lancerScan} disabled={scanEnCours} style={boutonPrimaire}>
              <Icon name="radar" size={14} />
              {scanEnCours ? "Scan en cours…" : "Lancer un scan"}
            </button>
          </div>
          {resultatScan && (
            <p style={{ fontSize: 12.5, color: T.green, marginTop: 12 }}>
              {resultatScan.scanned} produit(s) traité(s). Le détail est dans l'historique, section « Santé du site ».
            </p>
          )}
        </div>
      )}

      <div style={carte}>
        <Titre aide="Les produits les plus souvent remontés par les scans — pas les plus recherchés par les visiteurs.">
          Produits les plus scannés
        </Titre>
        {!stats && <Rien>Chargement…</Rien>}
        {stats?.topProducts.length === 0 && <Rien>Aucune donnée pour l'instant.</Rien>}
        {stats?.topProducts.length > 0 && (
          <Tableau colonnes={["Produit", "Occurrences"]}>
            {stats.topProducts.map((p) => (
              <tr key={p.query}>
                <td style={{ ...cellule, textTransform: "capitalize" }}>{p.query}</td>
                <td style={{ ...cellule, color: T.sub }}>{p.times_seen}×</td>
              </tr>
            ))}
          </Tableau>
        )}
      </div>

      {estAdmin && (
        <div style={carte}>
          <Titre aide="Format attendu par Excel en français : séparateur point-virgule, accents préservés.">
            Exporter
          </Titre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => apiAdminExport(token, "membres")} style={boutonSecondaire}>
              <Icon name="share" size={14} /> Membres (CSV)
            </button>
            <button onClick={() => apiAdminExport(token, "deals")} style={boutonSecondaire}>
              <Icon name="share" size={14} /> Deals communautaires (CSV)
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Courbes en aires empilées, dessinées en SVG plutôt qu'avec la
 * bibliothèque de graphiques déjà présente : celle-ci pèse 250 ko et n'est
 * chargée que sur la fiche produit. En amener tout le poids dans le panneau
 * admin pour quatre séries serait disproportionné.
 */
function Courbes({ activite }) {
  const series = [
    { cle: "inscriptions", libelle: "Inscriptions", couleur: T.emberSolid },
    { cle: "deals", libelle: "Deals", couleur: T.green },
    { cle: "commentaires", libelle: "Commentaires", couleur: T.cyan },
    { cle: "forum", libelle: "Forum", couleur: T.purple },
  ];
  const jours = activite.series;
  const max = Math.max(1, ...jours.flatMap((j) => series.map((s) => j[s.cle])));
  const L = 720;
  const H = 150;
  const pasX = jours.length > 1 ? L / (jours.length - 1) : L;

  const chemin = (cle) =>
    jours.map((j, i) => `${i === 0 ? "M" : "L"} ${(i * pasX).toFixed(1)} ${(H - (j[cle] / max) * H).toFixed(1)}`).join(" ");

  const totaux = Object.fromEntries(
    series.map((s) => [s.cle, jours.reduce((n, j) => n + j[s.cle], 0)])
  );

  return (
    <div style={carte}>
      <Titre
        aide={`Sur ${activite.jours} jours. Les jours sans activité apparaissent à zéro — sans eux, la courbe se resserrerait sur les seuls jours actifs et donnerait une fausse impression de régularité.`}
        action={
          <span style={{ fontSize: 12, color: T.sub }}>
            <strong style={{ color: T.ink }}>{activite.membresActifs}</strong> membre(s) actif(s)
          </span>
        }
      >
        Activité du site
      </Titre>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        {series.map((s) => (
          <span key={s.cle} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: T.sub }}>
            <span style={{ width: 10, height: 3, borderRadius: 2, background: s.couleur }} />
            {s.libelle} <strong style={{ color: T.ink }}>{totaux[s.cle]}</strong>
          </span>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 -8 ${L} ${H + 24}`} width="100%" height="180" preserveAspectRatio="none" role="img" aria-label="Activité du site sur 30 jours">
          {/* Trois repères horizontaux : sans eux, une courbe plate et une
              courbe forte se ressemblent. */}
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1="0" y1={H - f * H} x2={L} y2={H - f * H} stroke={T.line} strokeWidth="1" />
          ))}
          {series.map((s) => (
            <path key={s.cle} d={chemin(s.cle)} fill="none" stroke={s.couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </svg>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.muted, marginTop: 4 }}>
        <span>{jours[0]?.jour}</span>
        <span>maximum {max}/jour</span>
        <span>{jours[jours.length - 1]?.jour}</span>
      </div>
    </div>
  );
}
