// SectionSante.jsx — État des services extérieurs, historique des scans,
// journal des emails et diagnostic d'un produit.
//
// Ces pannes ne se lisaient que dans les journaux de l'hébergeur : c'est
// la section qui répond à « pourquoi le site ne trouve-t-il rien ? ».
import { useState, useEffect } from "react";
import { T } from "../../theme.js";
import Icon from "../Icon.jsx";
import { apiAdminHealth, apiAdminScans, apiAdminEmails, apiAdminDiagnostic } from "../../api.js";
import { relativeTime } from "../../utils.js";
import { carte, Titre, Etat, Puce, Tableau, cellule, Rien, champ, boutonPrimaire } from "./ui.jsx";

const NOMS = {
  serpapi: ["SerpApi", "Source principale des offres (quota mensuel)"],
  brightdata: ["Bright Data", "Repli quand SerpApi échoue (facturé au volume)"],
  resend: ["Resend", "Envoi des alertes email"],
};

export default function SectionSante({ token, estAdmin }) {
  const [sante, setSante] = useState(null);
  const [scans, setScans] = useState(null);
  const [emails, setEmails] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    apiAdminHealth(token).then(setSante).catch((e) => setErreur(e.message));
    apiAdminScans(token).then((d) => setScans(d.items)).catch(() => setScans([]));
    apiAdminEmails(token).then((d) => setEmails(d)).catch(() => setEmails({ items: [], stats: {} }));
  }, [token]);

  return (
    <>
      <div style={carte}>
        <Titre aide="L'état se déduit de la série d'échecs en cours, pas du dernier appel isolé : c'est elle qui distingue un hoquet passager d'une panne installée.">
          État des services
        </Titre>
        {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
        {!sante && !erreur && <Rien>Chargement…</Rien>}

        {sante && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sante.sources.map((s) => {
              const [nom, role] = NOMS[s.source] || [s.source, ""];
              const cleAbsente = sante.clesPresentes[s.source] === false;
              return (
                <div
                  key={s.source}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap",
                    background: T.surface2, border: `1px solid ${T.line}`,
                    borderRadius: T.radiusMd, padding: "12px 14px",
                  }}
                >
                  <div style={{ minWidth: 190, flex: "1 1 190px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 13.5, color: T.ink }}>{nom}</strong>
                      <Etat etat={s.etat} />
                      {/* Une clé absente explique un service muet bien plus
                          sûrement qu'une panne : il faut le dire d'emblée. */}
                      {cleAbsente && <Puce ton={T.yellow}>clé non configurée</Puce>}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>{role}</div>
                  </div>

                  <div style={{ flex: "2 1 260px", fontSize: 11.5, color: T.sub, lineHeight: 1.7 }}>
                    <div>
                      Dernier succès : {s.dernierSucces ? relativeTime(s.dernierSucces) : "jamais"}
                      {" · "}
                      {s.appels24h} appel(s) sur 24 h, {s.succes24h} réussi(s)
                    </div>
                    {s.serieEchecs > 0 && (
                      <div style={{ color: s.etat === "panne" ? T.red : T.yellow }}>
                        {s.serieEchecs} échec(s) d'affilée — {s.dernierMessage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.sub, marginTop: 4 }}>
              <Puce ton={sante.cronActif ? T.green : T.red}>
                scan planifié {sante.cronActif ? "actif" : "désactivé"}
              </Puce>
              {sante.dernierScan ? (
                <span>
                  Dernier scan {relativeTime(sante.dernierScan.started_at)} —{" "}
                  {sante.dernierScan.ok_count} produit(s) traité(s), {sante.dernierScan.fail_count} en échec
                </span>
              ) : (
                <span>Aucun scan enregistré pour l'instant.</span>
              )}
              {!sante.clesPresentes.adminEmail && (
                <Puce ton={T.yellow}>ADMIN_EMAIL absent — aucune alerte de panne ne peut partir</Puce>
              )}
            </div>
          </div>
        )}
      </div>

      {sante?.persistance && <Persistance etat={sante.persistance} />}

      {estAdmin && <Diagnostic token={token} />}

      <div style={carte}>
        <Titre aide="Une ligne par exécution, planifiée ou lancée à la main.">Historique des scans</Titre>
        {scans === null && <Rien>Chargement…</Rien>}
        {scans?.length === 0 && <Rien>Aucun scan enregistré. Le premier apparaîtra ici.</Rien>}
        {scans?.length > 0 && (
          <Tableau colonnes={["Quand", "Origine", "Traités", "Échecs", "Offres", "Erreur"]}>
            {scans.map((r) => (
              <tr key={r.id}>
                <td style={{ ...cellule, color: T.muted, whiteSpace: "nowrap" }}>{relativeTime(r.started_at)}</td>
                <td style={cellule}>
                  <Puce ton={r.source === "cron" ? T.sub : T.emberSolid}>
                    {r.source === "cron" ? "planifié" : `manuel · ${r.lance_par || "?"}`}
                  </Puce>
                </td>
                <td style={{ ...cellule, color: T.green, fontWeight: 800 }}>{r.ok_count}</td>
                <td style={{ ...cellule, color: r.fail_count > 0 ? T.red : T.muted, fontWeight: 800 }}>{r.fail_count}</td>
                <td style={cellule}>{r.offers_count}</td>
                <td style={{ ...cellule, color: T.sub, maxWidth: 280 }}>{r.error || "—"}</td>
              </tr>
            ))}
          </Tableau>
        )}
      </div>

      <div style={carte}>
        <Titre
          aide="Si une alerte n'est pas partie, la raison est ici. Auparavant, un refus de Resend ne se voyait nulle part."
          action={
            emails?.stats && (
              <span style={{ fontSize: 12, color: T.sub }}>
                {emails.stats.envoyes7j}/{emails.stats.total7j} envoyés sur 7 jours
                {emails.stats.echecs7j > 0 && <span style={{ color: T.red }}> · {emails.stats.echecs7j} échec(s)</span>}
              </span>
            )
          }
        >
          Emails envoyés
        </Titre>
        {emails === null && <Rien>Chargement…</Rien>}
        {emails?.items.length === 0 && <Rien>Aucun email envoyé pour l'instant.</Rien>}
        {emails?.items.length > 0 && (
          <Tableau colonnes={["Quand", "Destinataire", "Motif", "Objet", "Résultat"]}>
            {emails.items.map((e) => (
              <tr key={e.id}>
                <td style={{ ...cellule, color: T.muted, whiteSpace: "nowrap" }}>{relativeTime(e.created_at)}</td>
                <td style={cellule}>{e.to_email}</td>
                <td style={cellule}><Puce>{e.motif || "—"}</Puce></td>
                <td style={{ ...cellule, color: T.sub }}>{e.subject || "—"}</td>
                <td style={cellule}>
                  {e.ok ? (
                    <Puce ton={T.green}>envoyé</Puce>
                  ) : (
                    <span style={{ color: T.red, fontSize: 11.5 }}>{e.error || "échec"}</span>
                  )}
                </td>
              </tr>
            ))}
          </Tableau>
        )}
      </div>
    </>
  );
}

/**
 * Rejoue un produit et montre le raisonnement complet. Le bouton de scan
 * existant lançait le travail sans jamais rien montrer : impossible de
 * comprendre pourquoi un résultat était mauvais.
 */
/* ── Persistance des données ────────────────────────────────────
   Les comptes disparaissaient à chaque déploiement, et rien ne le signalait :
   le serveur repartait sur une base vide et répondait normalement. Ce bloc
   rend l'invisible visible — où la base est écrite, ce qu'elle contient, et
   quelles copies existent pour la remettre d'aplomb. */
const ko = (o) => `${(o / 1024).toFixed(o < 102400 ? 1 : 0)} ko`;

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

function Diagnostic({ token }) {
  const [query, setQuery] = useState("");
  const [res, setRes] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const lancer = async (e) => {
    e.preventDefault();
    if (!query.trim() || enCours) return;
    setEnCours(true);
    setErreur(null);
    setRes(null);
    try {
      setRes(await apiAdminDiagnostic(token, query.trim()));
    } catch (e2) {
      setErreur(e2.message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={carte}>
      <Titre aide="Consomme une requête de quota. Montre ce qui a été récupéré, ce qui a été écarté et pourquoi, puis ce que l'algorithme en a conclu.">
        Diagnostiquer un produit
      </Titre>

      <form onSubmit={lancer} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex : Casque Sony WH-1000XM5"
          style={{ ...champ, flex: "1 1 260px" }}
        />
        <button type="submit" disabled={enCours || !query.trim()} style={boutonPrimaire}>
          <Icon name="radar" size={14} />
          {enCours ? "Analyse en cours…" : "Analyser"}
        </button>
      </form>

      {erreur && <p style={{ color: T.red, fontSize: 12.5 }}>{erreur}</p>}

      {res && (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: T.sub, marginBottom: 14 }}>
            <span><strong style={{ color: T.ink }}>{res.brutes}</strong> offre(s) récupérée(s)</span>
            <span><strong style={{ color: T.green }}>{res.retenues.length}</strong> retenue(s)</span>
            <span><strong style={{ color: T.yellow }}>{res.ecartees.length}</strong> écartée(s)</span>
            <span><strong style={{ color: T.emberSolid }}>{res.anomalies}</strong> anomalie(s)</span>
          </div>

          {res.ecartees.length > 0 && (
            <>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color: T.sub, marginBottom: 8 }}>Écartées, et pourquoi</h4>
              <Tableau colonnes={["Titre", "Marchand", "Prix", "Raison"]}>
                {res.ecartees.map((o, i) => (
                  <tr key={i}>
                    <td style={{ ...cellule, maxWidth: 320 }}>{o.name}</td>
                    <td style={{ ...cellule, color: T.sub }}>{o.seller}</td>
                    <td style={{ ...cellule, whiteSpace: "nowrap" }}>{Number(o.price).toFixed(2)} €</td>
                    <td style={cellule}><Puce ton={T.yellow}>{o.raison}</Puce></td>
                  </tr>
                ))}
              </Tableau>
            </>
          )}

          {res.analysees.length > 0 && (
            <>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color: T.sub, margin: "18px 0 8px" }}>Analyse des offres retenues</h4>
              <Tableau colonnes={["Marchand", "Prix", "Référence", "Écart", "Verdict", "Confiance"]}>
                {res.analysees.map((o, i) => (
                  <tr key={i}>
                    <td style={cellule}>{o.seller}</td>
                    <td style={{ ...cellule, whiteSpace: "nowrap" }}>{Number(o.price).toFixed(2)} €</td>
                    <td style={{ ...cellule, color: T.sub, whiteSpace: "nowrap" }}>
                      {o.refPrice ? `${o.refPrice} €` : "aucune"}
                    </td>
                    <td style={{ ...cellule, color: o.pct > 0 ? T.green : T.muted, whiteSpace: "nowrap" }}>
                      {o.pct > 0 ? `-${o.pct} %` : "—"}
                    </td>
                    <td style={cellule}>
                      <Puce ton={o.verdict === "erreur" ? T.red : o.verdict === "deal" ? T.emberSolid : T.muted}>
                        {o.verdict}
                      </Puce>
                    </td>
                    <td style={{ ...cellule, color: T.sub }}>{o.confidence ?? "—"}</td>
                  </tr>
                ))}
              </Tableau>
            </>
          )}

          {res.retenues.length === 0 && (
            <Rien>
              Aucune offre retenue : tout a été écarté par le filtrage. C'est le cas typique d'un nom de
              produit trop vague, ou d'un catalogue qui ne remonte que des accessoires.
            </Rien>
          )}
        </>
      )}
    </div>
  );
}
