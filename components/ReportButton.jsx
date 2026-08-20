// ReportButton.jsx — Bouton « Signaler » sous un contenu publié.
//
// Il n'existait aucun moyen pour un membre de remonter une arnaque ou un
// spam : les règles automatiques bloquaient en amont, mais ce qui passait
// au travers restait en ligne indéfiniment.
//
// Discret par défaut — un lien gris minuscule — parce qu'il ne doit pas
// concurrencer les actions normales (voter, commenter, ouvrir l'offre).
import { useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import { apiSignaler } from "../api.js";

const MOTIFS = [
  ["arnaque", "Arnaque ou lien trompeur"],
  ["spam", "Spam ou publicité"],
  ["offensant", "Propos offensants"],
  ["hors-sujet", "Hors sujet"],
  ["doublon", "Doublon"],
  ["autre", "Autre"],
];

export default function ReportButton({ type, id, token, onNeedAuth, taille = 11.5 }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("arnaque");
  const [note, setNote] = useState("");
  const [etat, setEtat] = useState(null); // null | "envoi" | "fait"
  const [erreur, setErreur] = useState(null);

  const envoyer = async (e) => {
    e.preventDefault();
    setEtat("envoi");
    setErreur(null);
    try {
      await apiSignaler(token, type, id, motif, note.trim() || undefined);
      setEtat("fait");
      setTimeout(() => setOuvert(false), 1800);
    } catch (e2) {
      setErreur(e2.message);
      setEtat(null);
    }
  };

  if (!ouvert) {
    return (
      <button
        onClick={() => (token ? setOuvert(true) : onNeedAuth?.())}
        title="Signaler ce contenu à la modération"
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "none", border: "none", padding: 0, cursor: "pointer",
          color: T.muted, fontSize: taille, fontFamily: "'Inter', sans-serif",
        }}
      >
        <Icon name="alertTriangle" size={taille} />
        Signaler
      </button>
    );
  }

  if (etat === "fait") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: taille, color: T.green }}>
        <Icon name="check" size={taille} />
        Signalement transmis
      </span>
    );
  }

  return (
    <form
      onSubmit={envoyer}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex", flexDirection: "column", gap: 7, width: "100%", maxWidth: 340,
        background: T.surface2, border: `1px solid ${T.line}`,
        borderRadius: 11, padding: "11px 12px", marginTop: 6,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>Signaler ce contenu</div>

      <select
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        style={{
          padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.line}`,
          background: T.surface, color: T.ink, fontSize: 12.5, fontFamily: "'Inter', sans-serif",
        }}
      >
        {MOTIFS.map(([id2, lib]) => <option key={id2} value={id2}>{lib}</option>)}
      </select>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 300))}
        placeholder="Précision (facultatif)"
        style={{
          padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.line}`,
          background: T.surface, color: T.ink, fontSize: 12.5, fontFamily: "'Inter', sans-serif",
        }}
      />

      {erreur && <span style={{ fontSize: 11.5, color: T.red }}>{erreur}</span>}

      <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => { setOuvert(false); setErreur(null); }}
          style={{
            padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.line}`,
            background: "transparent", color: T.sub, fontWeight: 800, fontSize: 12,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={etat === "envoi"}
          style={{
            padding: "6px 12px", borderRadius: 8, border: "none",
            background: T.red, color: "#FFF", fontWeight: 900, fontSize: 12,
            cursor: etat === "envoi" ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
          }}
        >
          {etat === "envoi" ? "…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
