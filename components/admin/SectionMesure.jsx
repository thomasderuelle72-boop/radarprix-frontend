// admin/SectionMesure.jsx — Est-ce que la détection est bonne, et comment le sait-on ?
//
// Un moteur de détection sans mesure se juge à l'impression qu'il laisse, ce
// qui est exactement la façon de le laisser dériver. Deux indicateurs, qui ne
// répondent pas à la même question :
//
//  - la précision : parmi ce qu'on a publié, quelle part tenait la route ?
//    Elle se nourrit des jugements portés ici même par la modération.
//  - le rappel : parmi les erreurs de prix réellement survenues, quelle part
//    a-t-on vue ? Il se mesure contre une vérité terrain externe, et c'est le
//    seul indicateur qui dit ce qu'on ne voit PAS.
//
// La liste des erreurs manquées est volontairement mise en avant : c'est la
// seule vue du panneau qui désigne du travail à faire plutôt qu'un résultat.
import { useEffect, useState } from "react";
import { T } from "../../theme.js";
import { apiAdminIndicateurs, apiAdminManquees, apiAdminMarchands } from "../../api.js";
import { carte, Titre, Chiffre, Puce, Tableau, cellule, Rien } from "./ui.jsx";

/** Un taux en pourcentage, ou le mot juste quand rien n'a été mesuré. */
function Taux({ valeur, sur }) {
  if (valeur == null) {
    return <span style={{ color: T.muted, fontSize: 13, fontWeight: 400 }}>pas encore mesuré</span>;
  }
  const pct = Math.round(valeur * 100);
  const ton = pct >= 80 ? T.green : pct >= 55 ? T.yellow : T.red;
  return (
    <span>
      <span style={{ color: ton, fontWeight: 900 }}>{pct} %</span>
      {sur != null && <span style={{ color: T.muted, fontSize: 11.5, fontWeight: 400 }}> sur {sur}</span>}
    </span>
  );
}

export default function SectionMesure({ token }) {
  const [ind, setInd] = useState(null);
  const [manquees, setManquees] = useState(null);
  const [marchands, setMarchands] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let annule = false;
    Promise.all([apiAdminIndicateurs(token), apiAdminManquees(token, 25), apiAdminMarchands(token, 25)])
      .then(([i, m, r]) => {
        if (annule) return;
        setInd(i);
        setManquees(m.manquees);
        setMarchands(r.marchands);
      })
      .catch((e) => !annule && setErreur(e.message));
    return () => { annule = true; };
  }, [token]);

  if (erreur) return <div style={{ ...carte, borderColor: `${T.red}55`, color: T.red, fontSize: 12.5 }}>{erreur}</div>;
  if (!ind) return <Rien>Chargement…</Rien>;

  return (
    <>
      <Titre aide={`Fenêtre d'observation : ${ind.fenetreJours} derniers jours.`}>Qualité de la détection</Titre>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ ...carte, marginBottom: 0, flex: "1 1 260px" }}>
          <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 800, letterSpacing: ".04em" }}>PRÉCISION</div>
          <div className="rp-display" style={{ fontSize: 30, marginTop: 6, lineHeight: 1 }}>
            <Taux valeur={ind.precision.taux} sur={ind.precision.juges > 0 ? `${ind.precision.juges} jugés` : null} />
          </div>
          <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginTop: 10 }}>
            Parmi les anomalies publiées et jugées, la part qui en était vraiment une.
            {ind.precision.juges === 0 && " Juge quelques deals depuis la section Modération pour l'alimenter."}
          </p>
        </div>

        <div style={{ ...carte, marginBottom: 0, flex: "1 1 260px" }}>
          <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 800, letterSpacing: ".04em" }}>RAPPEL</div>
          <div className="rp-display" style={{ fontSize: 30, marginTop: 6, lineHeight: 1 }}>
            <Taux valeur={ind.rappel.taux} sur={ind.rappel.referencesConnues > 0 ? `${ind.rappel.referencesConnues} connues` : null} />
          </div>
          <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginTop: 10 }}>
            Parmi les erreurs de prix réellement survenues et repérées ailleurs, la part que RadarPrix a vue.
            C'est le seul chiffre qui mesure ce qu'on rate.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <Chiffre valeur={ind.precision.publies} libelle="anomalies publiées" icone="radar" />
        <Chiffre valeur={ind.precision.fauxPositifs} libelle="faux positifs relevés" ton={ind.precision.fauxPositifs > 0 ? T.red : T.muted} icone="flame" />
        <Chiffre valeur={ind.rappel.trouvees} libelle="erreurs connues retrouvées" ton={T.green} icone="check" />
      </div>

      <div style={carte}>
        <Titre aide="Des erreurs de prix confirmées ailleurs que RadarPrix n'a pas détectées. Chaque ligne est une occasion d'améliorer le moteur : marchand non surveillé, seuil trop haut, produit hors catalogue.">
          Ce qu'on a raté
        </Titre>
        {!manquees || manquees.length === 0 ? (
          <Rien>
            Rien à signaler — soit la vérité terrain n'a pas encore été ingérée, soit tout ce qui est connu
            a bien été détecté.
          </Rien>
        ) : (
          <Tableau colonnes={["Produit", "Marchand", "Prix", "Repérée le"]}>
            {manquees.map((m) => (
              <tr key={m.id}>
                <td style={{ ...cellule, fontWeight: 700 }}>{m.title || m.label}</td>
                <td style={{ ...cellule, color: T.sub }}>{m.merchant || "—"}</td>
                <td style={{ ...cellule, fontWeight: 800, color: T.red }}>{m.price != null ? `${Math.round(m.price)} €` : "—"}</td>
                <td style={{ ...cellule, color: T.muted, fontSize: 11.5 }}>{(m.published_at || m.ingested_at || "").slice(0, 16)}</td>
              </tr>
            ))}
          </Tableau>
        )}
      </div>

      <div style={carte}>
        <Titre aide="Fiabilité mesurée à partir des jugements de modération et des votes, et non d'une liste de grandes enseignes écrite à la main. Elle pondère le classement des anomalies.">
          Réputation des marchands
        </Titre>
        {!marchands || marchands.length === 0 ? (
          <Rien>Aucun marchand n'a encore accumulé assez d'observations pour être classé.</Rien>
        ) : (
          <Tableau colonnes={["Marchand", "Fiabilité", "Observations"]}>
            {marchands.map((m) => {
              const pct = Math.round((m.fiabilite ?? 0) * 100);
              const ton = pct >= 70 ? T.green : pct >= 40 ? T.yellow : T.red;
              return (
                <tr key={m.marchand}>
                  <td style={{ ...cellule, fontWeight: 700 }}>
                    {m.marchand} {m.marketplace ? <Puce ton={T.yellow}>place de marché</Puce> : null}
                  </td>
                  <td style={cellule}>
                    <span style={{ color: ton, fontWeight: 900 }}>{pct} %</span>
                  </td>
                  <td style={{ ...cellule, color: T.sub }}>{m.observations ?? m.n ?? 0}</td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </div>
    </>
  );
}
