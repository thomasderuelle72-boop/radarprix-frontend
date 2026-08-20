// SectionModeration.jsx — File de signalements et journal des actions.
//
// C'était le manque le plus grave du site : une communauté ouverte, et
// aucun moyen de retirer un contenu ni de savoir qu'on aurait dû.
import { useState, useEffect, useCallback } from "react";
import { T } from "../../theme.js";
import Icon from "../Icon.jsx";
import { apiModReports, apiModSupprimer, apiModRejeterSignalement, apiModJournal } from "../../api.js";
import { relativeTime, dateLongue } from "../../utils.js";
import { carte, Titre, Tableau, cellule, Rien, Puce, boutonDanger, boutonSecondaire, confirmer } from "./ui.jsx";

const LIBELLES = {
  comment: "Commentaire",
  message: "Message",
  deal: "Deal",
  thread: "Sujet",
  reply: "Réponse",
};

const MOTIFS = {
  spam: T.yellow,
  arnaque: T.red,
  offensant: T.red,
  "hors-sujet": T.sub,
  doublon: T.sub,
  autre: T.sub,
};

export default function SectionModeration({ token, onCompteur }) {
  const [statut, setStatut] = useState("ouvert");
  const [items, setItems] = useState(null);
  const [journal, setJournal] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const d = await apiModReports(token, statut);
      setItems(d.items);
      onCompteur?.(d.ouverts);
    } catch (e) {
      setErreur(e.message);
      setItems([]);
    }
  }, [token, statut, onCompteur]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { apiModJournal(token).then((d) => setJournal(d.items)).catch(() => setJournal([])); }, [token]);

  const agir = async (cle, action) => {
    setEnCours(cle);
    setErreur(null);
    try {
      const d = await action();
      onCompteur?.(d.ouverts);
      await charger();
      apiModJournal(token).then((j) => setJournal(j.items)).catch(() => {});
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(null);
    }
  };

  const supprimer = (r) => {
    const quoi = LIBELLES[r.content_type] || "contenu";
    if (!confirmer(`Supprimer définitivement ce ${quoi.toLowerCase()} de ${r.contenu?.auteur} ?\n\nCette action est irréversible.`)) return;
    agir(`s${r.id}`, () => apiModSupprimer(token, r.content_type, r.content_id, r.reason));
  };

  return (
    <>
      <div style={carte}>
        <Titre
          aide="Chaque ligne montre le contenu visé et son auteur. Supprimer est définitif : l'action est consignée dans le journal, en bas de page."
          action={
            <div style={{ display: "flex", gap: 5, background: T.surface2, borderRadius: 9, padding: 4 }}>
              {[["ouvert", "En attente"], ["traite", "Traités"], ["rejete", "Rejetés"], ["tous", "Tous"]].map(([id, lib]) => (
                <button
                  key={id}
                  onClick={() => setStatut(id)}
                  style={{
                    padding: "6px 11px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: statut === id ? T.ember : "transparent",
                    color: statut === id ? "#0C0E14" : T.sub,
                    fontWeight: statut === id ? 900 : 700, fontSize: 11.5, fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {lib}
                </button>
              ))}
            </div>
          }
        >
          Signalements
        </Titre>

        {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
        {items === null && <Rien>Chargement…</Rien>}
        {items?.length === 0 && (
          <Rien>
            {statut === "ouvert"
              ? "Aucun signalement en attente. Les membres peuvent en déposer depuis le bouton « Signaler » sous chaque contenu."
              : "Rien dans cette catégorie."}
          </Rien>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items?.map((r) => (
            <div
              key={r.id}
              style={{
                background: T.surface2, border: `1px solid ${T.line}`,
                borderRadius: T.radiusMd, padding: "13px 15px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <Puce ton={MOTIFS[r.reason] || T.sub}>{r.reason}</Puce>
                <Puce>{LIBELLES[r.content_type] || r.content_type}</Puce>
                {r.status !== "ouvert" && <Puce ton={T.green}>{r.status === "traite" ? "traité" : "rejeté"}</Puce>}
                <span style={{ fontSize: 11.5, color: T.muted, marginLeft: "auto" }}>
                  signalé par {r.signale_par} · {relativeTime(r.created_at)}
                </span>
              </div>

              {/* Le contenu visé, tel qu'il est. Sans lui, la décision se
                  prendrait à l'aveugle sur la seule parole du signalant. */}
              {r.contenu ? (
                <div style={{ background: T.bgElevated, border: `1px solid ${T.line}`, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 4 }}>
                    par <strong style={{ color: T.ink }}>{r.contenu.auteur}</strong> · {relativeTime(r.contenu.createdAt)}
                  </div>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {r.contenu.extrait}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: T.muted, fontStyle: "italic" }}>
                  Ce contenu n'existe plus — supprimé entre-temps.
                </p>
              )}

              {r.note && (
                <p style={{ fontSize: 12, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>
                  <span style={{ color: T.muted }}>Précision du signalant :</span> {r.note}
                </p>
              )}

              {r.status === "ouvert" && (
                <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
                  {r.contenu && (
                    <button onClick={() => supprimer(r)} disabled={enCours === `s${r.id}`} style={boutonDanger}>
                      <Icon name="alertTriangle" size={14} />
                      {enCours === `s${r.id}` ? "…" : "Supprimer le contenu"}
                    </button>
                  )}
                  <button
                    onClick={() => agir(`r${r.id}`, () => apiModRejeterSignalement(token, r.id))}
                    disabled={enCours === `r${r.id}`}
                    style={boutonSecondaire}
                  >
                    <Icon name="check" size={14} />
                    {enCours === `r${r.id}` ? "…" : "Fausse alerte"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={carte}>
        <Titre aide="Toute suppression, suspension ou changement de rôle laisse une trace ici. Une action irréversible doit au moins être explicable.">
          Journal de modération
        </Titre>
        {journal === null && <Rien>Chargement…</Rien>}
        {journal?.length === 0 && <Rien>Aucune action pour l'instant.</Rien>}
        {journal?.length > 0 && (
          <Tableau colonnes={["Quand", "Qui", "Action", "Cible", "Détail"]}>
            {journal.map((l) => (
              <tr key={l.id}>
                <td style={{ ...cellule, color: T.muted, whiteSpace: "nowrap" }}>{relativeTime(l.created_at)}</td>
                <td style={{ ...cellule, whiteSpace: "nowrap" }}>{l.admin_nom || "—"}</td>
                <td style={cellule}><Puce ton={l.action.includes("suppr") ? T.red : T.sub}>{l.action}</Puce></td>
                <td style={{ ...cellule, whiteSpace: "nowrap" }}>{l.cible_nom || "—"}</td>
                <td style={{ ...cellule, color: T.sub, maxWidth: 320 }}>{l.detail || "—"}</td>
              </tr>
            ))}
          </Tableau>
        )}
      </div>
    </>
  );
}
