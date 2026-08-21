// SectionSante.jsx — L'état de la base et de sa persistance.
//
// Cette section rendait aussi compte des services extérieurs, de
// l'historique des scans, du journal d'emails et d'un diagnostic produit.
// Ces quatre volets décrivaient la machinerie d'acquisition, qui a été
// retirée : ils n'auraient plus affiché que des tableaux vides et des
// requêtes en 404.
//
// Ce qui reste est ce qui compte encore, et qui ne se lit nulle part
// ailleurs : où la base est écrite, ce qu'elle contient, et si elle
// survivra au prochain déploiement.
import { useState, useEffect } from "react";
import { T } from "../../theme.js";
import { apiAdminHealth } from "../../api.js";
import { relativeTime } from "../../utils.js";
import { carte, Titre, Puce, Tableau, cellule, Rien } from "./ui.jsx";

const ko = (o) => `${(o / 1024).toFixed(o < 102400 ? 1 : 0)} ko`;

export default function SectionSante({ token }) {
  const [sante, setSante] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    apiAdminHealth(token).then(setSante).catch((e) => setErreur(e.message));
  }, [token]);

  return (
    <>
      {erreur && (
        <div style={carte}>
          <p style={{ color: T.red, fontSize: 12.5, margin: 0 }}>{erreur}</p>
        </div>
      )}
      {!sante && !erreur && (
        <div style={carte}>
          <Rien>Chargement…</Rien>
        </div>
      )}
      {sante?.persistance && <Persistance etat={sante.persistance} />}
    </>
  );
}

function Persistance({ etat }) {
  const sauvegardes = etat.sauvegardes || [];
  return (
    <div style={carte}>
      <Titre aide="La base est un simple fichier. Tant qu'il est écrit dans le volume persistant de l'hébergeur, il survit aux mises à jour ; sinon il meurt avec le conteneur.">
        Persistance des données
      </Titre>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <Puce ton={etat.comptes > 0 ? T.green : T.yellow}>
          {etat.comptes} compte(s) en base
        </Puce>
        <Puce ton={etat.cheminExplicite ? T.green : T.yellow}>
          {etat.cheminExplicite ? "chemin fixé explicitement" : "chemin déduit du code"}
        </Puce>
        <Puce ton={sauvegardes.length > 0 ? T.green : T.yellow}>
          {sauvegardes.length > 0 ? `${sauvegardes.length} sauvegarde(s)` : "aucune sauvegarde"}
        </Puce>
      </div>

      <p style={{ fontSize: 12.5, color: T.sub, marginBottom: 4 }}>
        Fichier : <span style={{ fontFamily: "ui-monospace, monospace", color: T.ink }}>{etat.chemin}</span> · {ko(etat.tailleOctets)}
      </p>
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
        {etat.comptesAuDemarrage === etat.comptes
          ? "Aucun compte perdu depuis le dernier démarrage."
          : `${etat.comptes - etat.comptesAuDemarrage} compte(s) créé(s) depuis le dernier démarrage.`}
      </p>

      {sauvegardes.length === 0 ? (
        <Rien>
          Aucune copie pour l'instant — la première est prise au prochain démarrage,
          dès qu'il y a au moins un compte.
        </Rien>
      ) : (
        <Tableau colonnes={["Sauvegarde", "Taille", "Prise le"]}>
          {sauvegardes.slice(0, 6).map((s) => (
            <tr key={s.fichier}>
              <td style={{ ...cellule, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{s.fichier}</td>
              <td style={{ ...cellule, color: T.sub, whiteSpace: "nowrap" }}>{ko(s.taille)}</td>
              <td style={{ ...cellule, color: T.muted, whiteSpace: "nowrap" }}>{relativeTime(s.date) || s.date.slice(0, 16).replace("T", " ")}</td>
            </tr>
          ))}
        </Tableau>
      )}

      <p style={{ fontSize: 11.5, color: T.muted, marginTop: 10 }}>
        Une copie est prise à chaque démarrage. Si la base venait à disparaître
        ou à repartir vide, la plus récente est remise en place automatiquement.
      </p>
    </div>
  );
}

