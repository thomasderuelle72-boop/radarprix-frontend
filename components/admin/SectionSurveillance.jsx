// admin/SectionSurveillance.jsx — Les fiches marchandes suivies en continu.
//
// C'est le détecteur qui distingue RadarPrix d'un comparateur : au lieu
// d'interroger un agrégateur sur des mots-clés, on relit des fiches précises
// toutes les quinze minutes et on compare chaque marchand à lui-même. Une
// erreur de prix qui ne vit que vingt minutes n'est visible que comme ça.
//
// Le moteur était déployé mais tournait à vide, faute d'un écran pour lui
// donner des URLs. C'est ce que cette section apporte.
import { useEffect, useState } from "react";
import { T, CATEGORIES } from "../../theme.js";
import { apiAdminWatchList, apiAdminWatchAdd, apiAdminWatchRemove, apiAdminWatchRun, apiAdminWatchAmorcer, apiAdminWatchPeupler } from "../../api.js";
import Icon from "../Icon.jsx";
import { carte, boutonPrimaire, boutonSecondaire, boutonDanger, champ, Titre, Chiffre, Puce, Tableau, cellule, Rien, confirmer } from "./ui.jsx";

/** Le domaine seul : une URL de fiche complète est illisible dans un tableau. */
function domaine(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function dateCourte(sql) {
  if (!sql) return "jamais";
  const d = new Date(sql.replace(" ", "T") + "Z");
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SectionSurveillance({ token, estAdmin }) {
  const [urls, setUrls] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [encours, setEncours] = useState(false);
  const [rapport, setRapport] = useState(null);
  const [amorcage, setAmorcage] = useState(null);
  const [peuplement, setPeuplement] = useState(null);

  // Formulaire d'ajout
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [categorie, setCategorie] = useState("hightech");

  const charger = () =>
    apiAdminWatchList(token)
      .then((r) => setUrls(r.urls))
      .catch((e) => setErreur(e.message));

  useEffect(() => {
    charger();
  }, [token]);

  async function ajouter(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setErreur(null);
    try {
      await apiAdminWatchAdd(token, { url: url.trim(), label: label.trim() || null, category: categorie });
      setUrl("");
      setLabel("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function retirer(fiche) {
    if (!confirmer(`Ne plus surveiller « ${fiche.label || domaine(fiche.url)} » ?\n\nL'historique de prix déjà relevé est conservé.`)) return;
    try {
      await apiAdminWatchRemove(token, fiche.id);
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  // Amorçage : promeut en fiches surveillées les adresses marchandes que les
  // scans passés ont déjà observées. C'est ce qui met le détecteur en route
  // sans avoir à coller quarante adresses à la main — et sans inventer des
  // URL qui n'existeraient pas.
  async function amorcer() {
    setEncours(true);
    setErreur(null);
    setRapport(null);
    try {
      const r = await apiAdminWatchAmorcer(token, { limite: 40 });
      setAmorcage(r);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEncours(false);
    }
  }

  // Découverte automatique : lit les sitemaps que les marchands publient
  // pour les moteurs de recherche, et met les fiches trouvées sous
  // surveillance. Aucune clé, aucune saisie, aucun programme à attendre.
  async function peupler() {
    setEncours(true);
    setErreur(null);
    setPeuplement(null);
    try {
      setPeuplement(await apiAdminWatchPeupler(token, { enseignes: 3, fiches: 25 }));
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEncours(false);
    }
  }

  async function verifierMaintenant() {
    setEncours(true);
    setErreur(null);
    setRapport(null);
    try {
      const r = await apiAdminWatchRun(token);
      setRapport(r);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEncours(false);
    }
  }

  const total = urls?.length ?? 0;
  const jamaisVues = (urls || []).filter((u) => !u.last_checked_at).length;
  const enEchec = (urls || []).filter((u) => u.echecs > 0).length;

  return (
    <>
      <Titre
        aide="Chaque fiche est relue toutes les quinze minutes et son prix comparé à son propre passé chez ce marchand. C'est ce qui permet de repérer une erreur de prix isolée, qu'aucune comparaison entre marchands ne révélerait."
        action={
          estAdmin && (
            <button onClick={verifierMaintenant} disabled={encours || total === 0} style={{ ...boutonPrimaire, opacity: encours || total === 0 ? 0.6 : 1 }}>
              <Icon name="radar" size={15} />
              {encours ? "Vérification…" : "Vérifier maintenant"}
            </button>
          )
        }
      >
        Fiches surveillées
      </Titre>

      {erreur && <div style={{ ...carte, borderColor: `${T.red}55`, color: T.red, fontSize: 12.5 }}>{erreur}</div>}

      {/* Tant que rien n'est surveillé, le moteur d'erreur de prix ne peut
          rien trouver. On met donc l'amorçage en avant plutôt que de laisser
          un tableau vide sans explication. */}
      {estAdmin && (
        <div style={{ ...carte, borderColor: urls && urls.length === 0 ? `${T.ember}55` : T.line }}>
          <Titre aide="Les marchands publient la liste complète de leurs fiches dans leur sitemap, pour être indexés par les moteurs de recherche. On y puise directement : aucune clé d'API, aucune adresse à saisir, aucun programme d'affiliation à attendre. La découverte tourne aussi toutes les trois heures, par petits lots et en rotation entre enseignes.">
            Remplir le radar automatiquement
          </Titre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={peupler} disabled={encours} style={{ ...boutonPrimaire, opacity: encours ? 0.6 : 1 }}>
              <Icon name="radar" size={15} />
              {encours ? "Découverte en cours…" : "Découvrir des fiches maintenant"}
            </button>
            <button onClick={amorcer} disabled={encours} style={boutonSecondaire}>
              Reprendre les scans passés
            </button>
          </div>
        </div>
      )}

      {peuplement && (
        <div style={{ ...carte, borderColor: `${T.green}44` }}>
          <Titre>Découverte</Titre>
          <Tableau colonnes={["Enseigne", "Trouvées", "Nouvelles", "État"]}>
            {(peuplement.resultats || []).map((r, i) => (
              <tr key={r.enseigne || i}>
                <td style={{ ...cellule, fontWeight: 700 }}>{r.enseigne || "—"}</td>
                <td style={cellule}>{r.ok ? r.trouvees : "—"}</td>
                <td style={{ ...cellule, fontWeight: 800, color: r.ajoutees > 0 ? T.green : T.muted }}>
                  {r.ok ? r.ajoutees : "—"}
                </td>
                <td style={cellule}>
                  {r.ignore ? (
                    <Puce ton={T.yellow}>{r.motif}</Puce>
                  ) : r.ok ? (
                    <Puce ton={T.green}>{r.dejaConnues > 0 ? `${r.dejaConnues} déjà connue(s)` : "explorée"}</Puce>
                  ) : (
                    <Puce ton={T.red}>{r.erreur}</Puce>
                  )}
                </td>
              </tr>
            ))}
          </Tableau>
          <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
            Les fiches découvertes sont relues toutes les quinze minutes. Les premiers prix apparaîtront
            dans le tableau ci-dessous au prochain passage — ou tout de suite avec « Vérifier maintenant ».
          </p>
        </div>
      )}

      {amorcage && (
        <div style={{ ...carte, borderColor: amorcage.ajoutees > 0 ? `${T.green}44` : `${T.yellow}55` }}>
          <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, margin: 0 }}>
            <strong>{amorcage.ajoutees}</strong> fiche(s) mise(s) sous surveillance sur {amorcage.candidats} observée(s).{" "}
            {amorcage.ignorees > 0 && (
              <span style={{ color: T.sub }}>
                {amorcage.ignorees} écartée(s) : liens d'agrégateur, adresses invalides ou enseignes non retenues.
              </span>
            )}
          </p>
          {/* Le cas « zéro » a besoin d'être expliqué, sinon le bouton donne
              l'impression de ne rien faire. La cause est presque toujours la
              même : les scans n'enregistrent que le lien de l'agrégateur, et
              le vrai lien marchand ne s'obtient qu'en résolvant une offre. */}
          {amorcage.ajoutees === 0 && (
            <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.65, marginTop: 10, marginBottom: 0 }}>
              Rien à promouvoir pour l'instant : les scans passés n'ont enregistré que des liens
              d'agrégateur, qui ne permettent pas de relire le prix chez le marchand. Deux façons
              d'amorcer&nbsp;:
              <br />
              <strong style={{ color: T.ink }}>1.</strong> Lance une recherche sur le site — les liens
              marchands résolus au passage sont désormais conservés et mis sous surveillance
              automatiquement.
              <br />
              <strong style={{ color: T.ink }}>2.</strong> Colle directement quelques adresses de fiches
              produits dans le formulaire ci-dessous. C'est immédiat.
            </p>
          )}
          {Object.keys(amorcage.parMarchand || {}).length > 0 && (
            <p style={{ fontSize: 12, color: T.sub, marginTop: 8, marginBottom: 0 }}>
              {Object.entries(amorcage.parMarchand)
                .map(([m, n]) => `${m} (${n})`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <Chiffre valeur={total} libelle="fiches suivies" icone="search" />
        <Chiffre valeur={jamaisVues} libelle="jamais encore relevées" ton={jamaisVues > 0 ? T.yellow : T.muted} icone="clock" />
        <Chiffre valeur={enEchec} libelle="en échec de lecture" ton={enEchec > 0 ? T.red : T.muted} icone="flame" />
      </div>

      {rapport && (
        <div style={{ ...carte, borderColor: `${T.green}44` }}>
          <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
            <strong>{rapport.verifiees}</strong> fiche(s) relue(s).{" "}
            {(() => {
              const anomalies = (rapport.resultats || []).filter((r) => r.verdict && r.verdict !== "normal");
              return anomalies.length > 0 ? (
                <span style={{ color: T.red, fontWeight: 800 }}>{anomalies.length} anomalie(s) détectée(s).</span>
              ) : (
                <span style={{ color: T.sub }}>Aucune anomalie — les prix relevés sont conformes à leur passé.</span>
              );
            })()}
          </p>
        </div>
      )}

      {estAdmin && (
        <form onSubmit={ajouter} style={{ ...carte }}>
          <Titre aide="Colle l'adresse d'une fiche produit précise chez un marchand, pas une page de catégorie ni un résultat de recherche. Le prix est lu dans les données structurées de la page, sans navigateur ni clé d'API.">
            Ajouter une fiche
          </Titre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.marchand.fr/produit/..."
              style={{ ...champ, flex: "3 1 320px" }}
              type="url"
              required
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nom lisible (facultatif)"
              style={{ ...champ, flex: "2 1 180px" }}
            />
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ ...champ, flex: "1 1 140px" }}>
              {CATEGORIES.filter((c) => c.id !== "tout").map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <button type="submit" style={boutonPrimaire}>
              <Icon name="sparkle" size={15} />
              Ajouter
            </button>
          </div>
        </form>
      )}

      <div style={carte}>
        {!urls ? (
          <Rien>Chargement…</Rien>
        ) : urls.length === 0 ? (
          <Rien>
            Aucune fiche surveillée. Le moteur d'erreur de prix est déployé mais tourne à vide tant que
            cette liste est vide — c'est ici qu'il se met en route.
          </Rien>
        ) : (
          <Tableau colonnes={["Fiche", "Marchand", "Dernier prix", "Dernière lecture", estAdmin ? "" : null].filter(Boolean)}>
            {urls.map((u) => (
              <tr key={u.id}>
                <td style={cellule}>
                  <a href={u.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: T.ink, fontWeight: 700, textDecoration: "none" }}>
                    {u.label || domaine(u.url)}
                  </a>
                  {u.echecs > 0 && (
                    <>
                      {" "}
                      <Puce ton={T.red}>{u.echecs} échec(s)</Puce>
                    </>
                  )}
                </td>
                <td style={{ ...cellule, color: T.sub }}>{u.merchant || domaine(u.url)}</td>
                <td style={{ ...cellule, fontWeight: 800 }}>
                  {u.last_price != null ? `${Math.round(u.last_price)} €` : <span style={{ color: T.muted, fontWeight: 400 }}>—</span>}
                </td>
                <td style={{ ...cellule, color: T.sub, fontSize: 11.5 }}>{dateCourte(u.last_checked_at)}</td>
                {estAdmin && (
                  <td style={{ ...cellule, textAlign: "right" }}>
                    <button onClick={() => retirer(u)} style={boutonDanger}>Retirer</button>
                  </td>
                )}
              </tr>
            ))}
          </Tableau>
        )}
      </div>
    </>
  );
}
