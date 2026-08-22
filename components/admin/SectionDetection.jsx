// SectionDetection.jsx — Les cibles du moteur d'acquisition, et les scans.
//
// Le backend expose ces routes depuis la refonte du moteur, mais aucune
// interface ne les appelait : la seule façon de déclarer un produit à
// surveiller était une commande curl avec un jeton copié à la main. Ce
// n'est pas tenable — ni depuis un téléphone, ni pour une tâche qu'on
// refait à chaque fois qu'on veut suivre un produit de plus.
//
// Une cible, c'est un produit ET de quoi aller le chercher. Deux canaux :
//
//   • un flux RSS/XML marchand — gratuit, aucune clé, idéal pour démarrer ;
//   • des domaines marchands confiés à Firecrawl — qui consomme des crédits.
//
// Le formulaire impose ce choix plutôt que de laisser deux champs vides
// côte à côte : le backend refuse une cible sans source, autant que
// l'interface rende l'erreur impossible.
import { useState, useEffect, useCallback } from "react";
import { T, CATEGORIES } from "../../theme.js";
import {
  apiCibles, apiCibleAjouter, apiCibleModifier, apiCibleSupprimer,
  apiScanLancer, apiScanStatut,
} from "../../api.js";
import { relativeTime } from "../../utils.js";
import Icon from "../Icon.jsx";
import {
  carte, boutonPrimaire, boutonSecondaire, boutonDanger, champ,
  Titre, Puce, Etat, Tableau, cellule, Rien, confirmer,
} from "./ui.jsx";

/* Deux cibles pour partir de zéro. La première ne coûte rien et suffit à
   vérifier que la chaîne complète fonctionne ; la seconde entame le quota
   Firecrawl — d'où l'ordre, et la mention du coût. */
const MODELES = [
  {
    libelle: "Bons plans Dealabs",
    detail: "flux public · aucun crédit consommé",
    valeurs: { query: "Les bons plans du moment", category: "tout", merchant: "", canal: "flux", feedUrl: "https://www.dealabs.com/rss", domains: "" },
  },
  {
    libelle: "iPhone 15 chez Cdiscount",
    detail: "scraping Firecrawl · consomme des crédits",
    valeurs: { query: "iPhone 15 128 Go", category: "hightech", merchant: "Cdiscount", canal: "domaines", feedUrl: "", domains: "cdiscount.com" },
  },
];

const VIDE = { query: "", category: "tout", merchant: "", canal: "flux", feedUrl: "", domains: "" };

export default function SectionDetection({ token, estAdmin }) {
  const [cibles, setCibles] = useState(null);
  const [statut, setStatut] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [scanEnCours, setScanEnCours] = useState(false);

  const recharger = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([apiCibles(token), apiScanStatut(token)]);
      setCibles(c.items || []);
      setStatut(s);
      setErreur(null);
    } catch (e) {
      setErreur(e.message);
    }
  }, [token]);

  useEffect(() => { recharger(); }, [recharger]);

  // Le serveur répond 202 et poursuit en arrière-plan : sans ce délai avant
  // rechargement, on afficherait l'état d'avant le scan et le tableau
  // paraîtrait figé.
  async function lancer(targetId) {
    setScanEnCours(true);
    try {
      await apiScanLancer(token, targetId);
      setErreur(null);
      setTimeout(() => { recharger(); setScanEnCours(false); }, 6000);
    } catch (e) {
      setErreur(e.message);
      setScanEnCours(false);
    }
  }

  return (
    <>
      {erreur && (
        <div style={carte}>
          <p style={{ color: T.red, fontSize: 12.5, margin: 0 }}>{erreur}</p>
        </div>
      )}

      {estAdmin && <Formulaire token={token} onAjout={recharger} onErreur={setErreur} />}

      <ListeCibles
        cibles={cibles}
        estAdmin={estAdmin}
        scanEnCours={scanEnCours}
        onScan={lancer}
        onBasculer={async (c) => {
          try {
            await apiCibleModifier(token, c.id, { active: !c.active });
            recharger();
          } catch (e) { setErreur(e.message); }
        }}
        onSupprimer={async (c) => {
          if (!confirmer(`Retirer « ${c.query} » du suivi ?\n\nLes offres déjà publiées et l'historique de prix restent en place.`)) return;
          try {
            await apiCibleSupprimer(token, c.id);
            recharger();
          } catch (e) { setErreur(e.message); }
        }}
      />

      <Journal statut={statut} scanEnCours={scanEnCours} onScan={() => lancer(null)} peutScanner={(cibles?.length || 0) > 0} />
    </>
  );
}

/* ── Ajout d'une cible ─────────────────────────────────────────── */

function Formulaire({ token, onAjout, onErreur }) {
  const [f, setF] = useState(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const modifier = (cle) => (e) => setF((v) => ({ ...v, [cle]: e.target.value }));

  const pretASoumettre = f.query.trim().length >= 3 &&
    (f.canal === "flux" ? /^https?:\/\//.test(f.feedUrl.trim()) : f.domains.trim().length > 0);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await apiCibleAjouter(token, {
        query: f.query.trim(),
        category: f.category,
        merchant: f.merchant.trim() || undefined,
        // On n'envoie que le canal choisi : transmettre les deux laisserait
        // au backend le soin d'arbitrer, ce qui n'est pas son rôle.
        ...(f.canal === "flux"
          ? { feedUrl: f.feedUrl.trim() }
          : { domains: f.domains.split(",").map((d) => d.trim()).filter(Boolean) }),
      });
      setF(VIDE);
      onErreur(null);
      onAjout();
    } catch (err) {
      onErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} style={carte}>
      <Titre aide="Un produit à surveiller, et par où le chercher. Le flux est gratuit et sans clé ; les domaines marchands passent par Firecrawl et consomment des crédits.">
        Ajouter une cible
      </Titre>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {MODELES.map((m) => (
          <button
            key={m.libelle}
            type="button"
            onClick={() => setF(m.valeurs)}
            style={{ ...boutonSecondaire, flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "8px 13px", textAlign: "left" }}
          >
            <span style={{ color: T.ink }}>{m.libelle}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted }}>{m.detail}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <Ligne libelle="Produit ou recherche suivie">
          <input
            value={f.query}
            onChange={modifier("query")}
            placeholder="iPhone 15 128 Go"
            style={{ ...champ, width: "100%" }}
          />
        </Ligne>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <Ligne libelle="Catégorie">
            <select value={f.category} onChange={modifier("category")} style={{ ...champ, width: "100%" }}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Ligne>
          <Ligne libelle="Marchand (facultatif)">
            <input value={f.merchant} onChange={modifier("merchant")} placeholder="Cdiscount" style={{ ...champ, width: "100%" }} />
          </Ligne>
        </div>

        <Ligne libelle="Où chercher">
          <div style={{ display: "flex", gap: 6, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 4 }}>
            {[["flux", "Flux RSS/XML", "gratuit"], ["domaines", "Domaines marchands", "Firecrawl"]].map(([id, libelle, note]) => {
              const actif = f.canal === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setF((v) => ({ ...v, canal: id }))}
                  aria-pressed={actif}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: actif ? T.ember : "transparent",
                    color: actif ? "#0C0E14" : T.sub,
                    fontWeight: actif ? 900 : 700, fontSize: 12, fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {libelle}
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{note}</span>
                </button>
              );
            })}
          </div>
        </Ligne>

        {f.canal === "flux" ? (
          <Ligne libelle="URL du flux">
            <input
              value={f.feedUrl}
              onChange={modifier("feedUrl")}
              placeholder="https://www.dealabs.com/rss"
              inputMode="url"
              style={{ ...champ, width: "100%" }}
            />
          </Ligne>
        ) : (
          <Ligne libelle="Domaines, séparés par des virgules">
            <input
              value={f.domains}
              onChange={modifier("domains")}
              placeholder="cdiscount.com, boulanger.com"
              style={{ ...champ, width: "100%" }}
            />
          </Ligne>
        )}
      </div>

      <button
        type="submit"
        disabled={!pretASoumettre || envoi}
        style={{ ...boutonPrimaire, marginTop: 16, width: "100%", opacity: pretASoumettre && !envoi ? 1 : 0.45, cursor: pretASoumettre && !envoi ? "pointer" : "not-allowed" }}
      >
        {envoi ? "Ajout…" : "Ajouter la cible"}
      </button>
    </form>
  );
}

function Ligne({ libelle, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: ".03em", marginBottom: 5 }}>
        {libelle.toUpperCase()}
      </span>
      {children}
    </label>
  );
}

/* ── Cibles suivies ────────────────────────────────────────────── */

function ListeCibles({ cibles, estAdmin, scanEnCours, onScan, onBasculer, onSupprimer }) {
  if (cibles === null) {
    return <div style={carte}><Rien>Chargement…</Rien></div>;
  }

  return (
    <div style={carte}>
      <Titre aide="Une cible inactive reste en base mais n'est plus balayée. La retirer ne supprime ni les offres publiées ni l'historique de prix.">
        Cibles suivies ({cibles.length})
      </Titre>

      {cibles.length === 0 ? (
        <Rien>
          Aucune cible pour l'instant — le moteur n'a donc rien à balayer et le
          site restera vide. Commence par le flux Dealabs ci-dessus : il ne
          coûte rien et vérifie toute la chaîne.
        </Rien>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {cibles.map((c) => (
            <div
              key={c.id}
              style={{
                border: `1px solid ${T.line}`, borderRadius: 10, padding: "12px 14px",
                background: c.active ? "transparent" : `${T.muted}0C`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13.5, color: c.active ? T.ink : T.muted }}>{c.query}</strong>
                <Puce ton={c.active ? T.green : T.muted}>{c.active ? "active" : "en pause"}</Puce>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
                <Puce>{CATEGORIES.find((k) => k.id === c.category)?.label || c.category}</Puce>
                {c.merchant && <Puce>{c.merchant}</Puce>}
                <Puce ton={c.feedUrl ? T.green : T.yellow}>
                  {c.feedUrl ? "flux" : `Firecrawl · ${c.searchDomains.length} domaine(s)`}
                </Puce>
              </div>

              <p style={{ fontSize: 11.5, color: T.muted, fontFamily: "ui-monospace, monospace", wordBreak: "break-all", margin: "0 0 10px" }}>
                {c.feedUrl || c.searchDomains.join(", ")}
              </p>

              {estAdmin && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <button onClick={() => onScan(c.id)} disabled={scanEnCours || !c.active} style={{ ...boutonSecondaire, opacity: scanEnCours || !c.active ? 0.45 : 1 }}>
                    <Icon name="radar" size={13} />
                    Scanner
                  </button>
                  <button onClick={() => onBasculer(c)} style={boutonSecondaire}>
                    {c.active ? "Mettre en pause" : "Réactiver"}
                  </button>
                  <button onClick={() => onSupprimer(c)} style={boutonDanger}>
                    Retirer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Scans et santé des canaux ─────────────────────────────────── */

function Journal({ statut, scanEnCours, onScan, peutScanner }) {
  const runs = statut?.runs || [];
  const canaux = statut?.collecte || [];

  return (
    <div style={carte}>
      <Titre
        aide="Un scan balaye toutes les cibles actives : collecte, analyse des prix, puis publication des anomalies. Le cron le déclenche déjà toutes les trois heures."
        action={
          <button
            onClick={onScan}
            disabled={scanEnCours || !peutScanner}
            style={{ ...boutonPrimaire, opacity: scanEnCours || !peutScanner ? 0.45 : 1 }}
          >
            <Icon name="radar" size={14} />
            {scanEnCours ? "Scan en cours…" : "Lancer un scan"}
          </button>
        }
      >
        Scans
      </Titre>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {canaux.map((c) => (
          <div key={c.source} style={{ flex: "1 1 210px", border: `1px solid ${T.line}`, borderRadius: 10, padding: "11px 13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <strong style={{ fontSize: 12.5, color: T.ink }}>{c.source === "flux" ? "Flux marchands" : "Firecrawl"}</strong>
              <Etat etat={c.etat} />
            </div>
            <p style={{ fontSize: 11.5, color: T.sub, margin: 0 }}>
              {c.appels24h > 0 ? `${c.succes24h}/${c.appels24h} appel(s) réussi(s) sur 24 h` : "aucun appel sur 24 h"}
            </p>
            {c.dernierMessage && c.serieEchecs > 0 && (
              <p style={{ fontSize: 11, color: T.red, marginTop: 5, marginBottom: 0 }}>{c.dernierMessage}</p>
            )}
            {/* Un canal peut réussir sans rien publier : les articles écartés
                faute de vendeur ou de prix de référence n'apparaissent nulle
                part ailleurs. Sans cette ligne, le panneau afficherait
                « opérationnel » devant un site vide. */}
            {c.dernierBilan && c.serieEchecs === 0 && (
              <p style={{ fontSize: 11, color: T.muted, marginTop: 5, marginBottom: 0 }}>{c.dernierBilan}</p>
            )}
          </div>
        ))}
      </div>

      {runs.length === 0 ? (
        <Rien>Aucun scan enregistré. Un balayage sans cible active ne laisse pas de trace : il n'y avait rien à parcourir.</Rien>
      ) : (
        <Tableau colonnes={["Lancé", "Par", "Cibles", "Offres", "Échecs"]}>
          {runs.slice(0, 10).map((r) => (
            <tr key={r.id}>
              <td style={{ ...cellule, whiteSpace: "nowrap", color: T.sub }}>
                {relativeTime(r.started_at) || r.started_at?.slice(0, 16).replace("T", " ")}
              </td>
              <td style={{ ...cellule, whiteSpace: "nowrap" }}>
                <Puce ton={r.source === "cron" ? T.purple : T.sub}>{r.source === "cron" ? "cron" : r.lance_par || "manuel"}</Puce>
              </td>
              <td style={cellule}>{r.size}</td>
              <td style={cellule}>{r.offers_count}</td>
              <td style={{ ...cellule, color: r.fail_count > 0 ? T.red : T.muted }}>{r.fail_count}</td>
            </tr>
          ))}
        </Tableau>
      )}
    </div>
  );
}
