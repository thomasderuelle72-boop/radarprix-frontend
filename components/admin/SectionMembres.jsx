// SectionMembres.jsx — Liste des membres avec recherche, filtres et actions,
// et fiche détaillée.
//
// L'ancienne version affichait 200 lignes brutes triées par date, sans champ
// de recherche : retrouver quelqu'un demandait de parcourir la page à l'œil,
// et aucune action n'était possible depuis là.
import { useState, useEffect, useCallback } from "react";
import { T } from "../../theme.js";
import Icon from "../Icon.jsx";
import Avatar from "../Avatar.jsx";
import { apiAdminMembers, apiAdminMemberSheet, apiModSuspendre, apiAdminRole } from "../../api.js";
import { relativeTime, anciennete, dateLongue } from "../../utils.js";
import { ouvrirProfil } from "../../routes.js";
import { carte, Titre, Tableau, cellule, Rien, Puce, champ, boutonSecondaire, boutonDanger, confirmer } from "./ui.jsx";

const FILTRES = [
  ["tous", "Tous"],
  ["signales", "Signalés"],
  ["suspendus", "Suspendus"],
  ["equipe", "Équipe"],
  ["inactifs", "Inactifs"],
];

const TRIS = [
  ["recent", "Plus récents"],
  ["ancien", "Plus anciens"],
  ["actif", "Plus actifs"],
  ["signale", "Plus signalés"],
  ["alpha", "Alphabétique"],
];

export default function SectionMembres({ token, estAdmin, moiId }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [tri, setTri] = useState("recent");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [fiche, setFiche] = useState(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      setData(await apiAdminMembers(token, { recherche, filtre, tri, page }));
    } catch (e) {
      setErreur(e.message);
      setData({ items: [] });
    }
  }, [token, recherche, filtre, tri, page]);

  // Recherche différée : sans ce délai, chaque frappe déclencherait une
  // requête, et les réponses pourraient revenir dans le désordre.
  useEffect(() => {
    const t = setTimeout(charger, recherche ? 300 : 0);
    return () => clearTimeout(t);
  }, [charger, recherche]);

  useEffect(() => { setPage(1); }, [recherche, filtre, tri]);

  const suspendre = async (m) => {
    const suspendu = m.suspended_until && new Date(m.suspended_until.replace(" ", "T") + "Z") > new Date();
    if (suspendu) {
      if (!confirmer(`Lever la suspension de ${m.pseudo || m.email} ?`)) return;
      await apiModSuspendre(token, m.id, 0);
    } else {
      const jours = window.prompt(`Suspendre ${m.pseudo || m.email} combien de jours ?`, "7");
      if (jours === null) return;
      const n = parseInt(jours, 10);
      if (!Number.isFinite(n) || n <= 0) return;
      const motif = window.prompt("Motif (visible par le membre) :", "Non-respect des règles de publication");
      if (motif === null) return;
      await apiModSuspendre(token, m.id, n, motif);
    }
    charger();
  };

  const changerRole = async (m, role) => {
    if (!confirmer(`Donner le rôle « ${role} » à ${m.pseudo || m.email} ?`)) return;
    try {
      await apiAdminRole(token, m.id, role);
      charger();
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <>
      <div style={carte}>
        <Titre aide="Chaque ligne porte ses compteurs et les signalements ouverts la visant : la décision se prend depuis la liste, sans ouvrir dix fiches.">
          Membres
        </Titre>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher un pseudo ou un email…"
            style={{ ...champ, flex: "1 1 240px" }}
          />
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ ...champ, flex: "0 0 150px" }}>
            {FILTRES.map(([id, lib]) => <option key={id} value={id}>{lib}</option>)}
          </select>
          <select value={tri} onChange={(e) => setTri(e.target.value)} style={{ ...champ, flex: "0 0 160px" }}>
            {TRIS.map(([id, lib]) => <option key={id} value={id}>{lib}</option>)}
          </select>
        </div>

        {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
        {data === null && <Rien>Chargement…</Rien>}
        {data?.items.length === 0 && <Rien>Aucun membre ne correspond.</Rien>}

        {data?.items.length > 0 && (
          <Tableau colonnes={["Membre", "Inscrit", "Activité", "Signalements", "Rôle", "Actions"]}>
            {data.items.map((m) => {
              const suspendu = m.suspended_until && new Date(m.suspended_until.replace(" ", "T") + "Z") > new Date();
              return (
                <tr key={m.id} style={{ opacity: suspendu ? 0.65 : 1 }}>
                  <td style={cellule}>
                    <button
                      onClick={() => setFiche(m.id)}
                      style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                    >
                      <Avatar email={m.email} pseudo={m.pseudo} avatarUrl={m.avatar_url} size={30} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: T.ink }}>
                          {m.pseudo || <span style={{ color: T.muted, fontWeight: 600 }}>sans pseudo</span>}
                        </span>
                        <span style={{ display: "block", fontSize: 11, color: T.muted }}>{m.email}</span>
                      </span>
                    </button>
                  </td>
                  <td style={{ ...cellule, color: T.sub, whiteSpace: "nowrap" }}>{anciennete(m.created_at)}</td>
                  <td style={{ ...cellule, whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 800 }}>{m.activite}</span>
                    <span style={{ color: T.muted, fontSize: 11 }}>
                      {" "}({m.deals}d · {m.commentaires}c · {m.forum}f)
                    </span>
                  </td>
                  <td style={cellule}>
                    {m.signalements > 0
                      ? <Puce ton={T.red}>{m.signalements} en attente</Puce>
                      : <span style={{ color: T.muted }}>—</span>}
                  </td>
                  <td style={cellule}>
                    {suspendu
                      ? <Puce ton={T.red}>suspendu</Puce>
                      : m.role === "admin"
                      ? <Puce ton={T.yellow}>administrateur</Puce>
                      : m.role === "moderator"
                      ? <Puce ton={T.purple}>modérateur</Puce>
                      : <span style={{ color: T.muted, fontSize: 11.5 }}>membre</span>}
                  </td>
                  <td style={cellule}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => setFiche(m.id)} style={{ ...boutonSecondaire, padding: "6px 10px" }}>
                        Fiche
                      </button>
                      {m.role !== "admin" && m.id !== moiId && (
                        <button
                          onClick={() => suspendre(m)}
                          style={{ ...(suspendu ? boutonSecondaire : boutonDanger), padding: "6px 10px" }}
                        >
                          {suspendu ? "Lever" : "Suspendre"}
                        </button>
                      )}
                      {estAdmin && m.id !== moiId && (
                        <select
                          value=""
                          onChange={(e) => e.target.value && changerRole(m, e.target.value)}
                          style={{ ...champ, padding: "6px 8px", fontSize: 11.5 }}
                        >
                          <option value="">Rôle…</option>
                          <option value="user">Membre</option>
                          <option value="moderator">Modérateur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}

        {(page > 1 || data?.hasMore) && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={boutonSecondaire}>
              Précédent
            </button>
            <span style={{ fontSize: 12.5, color: T.sub, alignSelf: "center" }}>page {page}</span>
            <button disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)} style={boutonSecondaire}>
              Suivant
            </button>
          </div>
        )}
      </div>

      {fiche && <FicheMembre token={token} id={fiche} onClose={() => setFiche(null)} />}
    </>
  );
}

/** Fiche détaillée, en surcouche pour ne pas perdre la liste et ses filtres. */
function FicheMembre({ token, id, onClose }) {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    setD(null);
    apiAdminMemberSheet(token, id).then(setD).catch((e) => setErreur(e.message));
  }, [token, id]);

  const VERBES = {
    deal: "a partagé un deal",
    comment: "a commenté",
    thread: "a ouvert une discussion",
    reply: "a répondu",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 110,
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rp-modal-in"
        style={{
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18,
          padding: "22px 24px", maxWidth: 640, width: "100%", margin: "24px 0",
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink }}>Fiche membre</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub }}>×</button>
        </div>

        {erreur && <p style={{ color: T.red, fontSize: 12.5 }}>{erreur}</p>}
        {!d && !erreur && <Rien>Chargement…</Rien>}

        {d && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
              <Avatar email={d.membre.email} pseudo={d.membre.pseudo} avatarUrl={d.membre.avatar_url} size={48} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>
                  {d.membre.pseudo || `Membre #${d.membre.id}`}
                </div>
                <div style={{ fontSize: 12, color: T.sub }}>{d.membre.email} · membre {anciennete(d.membre.created_at)}</div>
              </div>
              <button onClick={() => { onClose(); ouvrirProfil(d.membre.pseudo || d.membre.id); }} style={boutonSecondaire}>
                <Icon name="user" size={14} /> Profil public
              </button>
            </div>

            {d.suspension && (
              <div
                style={{
                  background: "rgba(255,52,93,.10)", border: `1px solid ${T.red}44`,
                  borderRadius: T.radiusMd, padding: "11px 14px", marginBottom: 16,
                  fontSize: 12.5, color: T.red, lineHeight: 1.6,
                }}
              >
                <strong>Suspendu jusqu'au {dateLongue(d.suspension.jusquA)}</strong>
                {d.suspension.motif && <> — {d.suspension.motif}</>}
              </div>
            )}

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: T.sub, marginBottom: 18 }}>
              <span><strong style={{ color: T.ink }}>{d.stats.deals.publies}</strong> deals</span>
              <span><strong style={{ color: T.ink }}>{d.stats.commentaires}</strong> commentaires</span>
              <span><strong style={{ color: T.ink }}>{d.stats.forum.sujets + d.stats.forum.reponses}</strong> forum</span>
              <span><strong style={{ color: T.ink }}>{d.stats.abonnes}</strong> abonnés</span>
              <span><strong style={{ color: T.ink }}>{d.signalementsDeposes}</strong> signalement(s) déposé(s)</span>
            </div>

            {d.sanctions.length > 0 && (
              <>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, color: T.sub, marginBottom: 8 }}>Historique de modération</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                  {d.sanctions.map((s) => (
                    <div key={s.id} style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
                      <Puce ton={s.action.includes("suspension") ? T.red : T.sub}>{s.action}</Puce>{" "}
                      {s.detail} <span style={{ color: T.muted }}>— {s.admin_nom}, {relativeTime(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h4 style={{ fontSize: 12.5, fontWeight: 800, color: T.sub, marginBottom: 8 }}>Activité récente</h4>
            {d.activite.length === 0 && <Rien>Ce membre n'a rien publié.</Rien>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {d.activite.slice(0, 15).map((a, i) => (
                <div key={i} style={{ fontSize: 12.5, color: T.ink, lineHeight: 1.5 }}>
                  <span style={{ color: T.muted }}>{VERBES[a.type] || a.type} · {relativeTime(a.created_at)} — </span>
                  {a.titre}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
