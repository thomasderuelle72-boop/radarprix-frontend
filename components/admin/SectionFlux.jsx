// admin/SectionFlux.jsx — Les collecteurs et ce qu'ils rapportent.
//
// Le backend savait déjà collecter (jeux offerts, promotions, codes promo) et
// exposait les routes correspondantes, mais rien ne les appelait : la seule
// façon de savoir si une source fonctionnait était de lire les journaux de
// l'hébergeur. C'est précisément ce qu'on voulait éviter en construisant la
// section « Santé du site ».
//
// Le bouton de collecte est ici le vrai outil de diagnostic : il rend, source
// par source, l'état réel — clé absente, erreur d'API, ou nombre d'offres
// rapportées — sans attendre le passage du cron.
import { useEffect, useState } from "react";
import { T } from "../../theme.js";
import { apiAdminCollecte, apiAdminFeedStats, apiAdminJugerDeal, apiFeed } from "../../api.js";
import Icon from "../Icon.jsx";
import { carte, boutonPrimaire, boutonSecondaire, boutonDanger, Titre, Chiffre, Puce, Tableau, cellule, Rien } from "./ui.jsx";

// Ce que chaque détecteur cherche. Affiché à côté des chiffres : « D1 » ne
// dit rien à quelqu'un qui n'a pas le code sous les yeux.
const DETECTEURS = {
  D1: { libelle: "Promotions et codes promo", ton: T.ember },
  D2: { libelle: "Produits offerts", ton: T.green },
  D3: { libelle: "Erreurs de prix", ton: T.red },
  D4: { libelle: "Baisses de prix", ton: T.yellow },
};

export default function SectionFlux({ token, estAdmin }) {
  const [stats, setStats] = useState(null);
  const [resultats, setResultats] = useState(null);
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [publies, setPublies] = useState(null);
  // Les identifiants déjà jugés pendant cette session : la ligne disparaît
  // aussitôt, pour qu'on voie fondre la pile de travail au lieu de rejuger
  // deux fois la même offre.
  const [juges, setJuges] = useState({});

  const charger = () =>
    Promise.all([apiAdminFeedStats(token), apiFeed({ pageSize: 25 })])
      .then(([s, f]) => {
        setStats(s.stats);
        setPublies(f.items || []);
      })
      .catch((e) => setErreur(e.message));

  useEffect(() => {
    charger();
  }, [token]);

  async function juger(deal, verdict) {
    setJuges((j) => ({ ...j, [deal.id]: verdict }));
    try {
      await apiAdminJugerDeal(token, deal.id, verdict, null);
    } catch (e) {
      setErreur(e.message);
      setJuges((j) => {
        const copie = { ...j };
        delete copie[deal.id]; // le jugement n'a pas pris : la ligne revient
        return copie;
      });
    }
  }

  async function lancer(detecteur) {
    setEncours(true);
    setErreur(null);
    setResultats(null);
    try {
      const r = await apiAdminCollecte(token, detecteur);
      setResultats(r.resultats);
      await charger(); // les compteurs ont bougé
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEncours(false);
    }
  }

  const totalPublies = (stats || []).reduce((n, s) => n + (s.publies || 0), 0);
  const totalCollectes = (stats || []).reduce((n, s) => n + (s.total || 0), 0);

  return (
    <>
      <Titre
        aide="Les collecteurs tournent seuls toutes les 30 minutes. Ce bouton les déclenche tout de suite et affiche, source par source, ce qu'ils ont réellement rapporté — la façon la plus rapide de vérifier qu'une clé d'API vient d'être correctement ajoutée."
        action={
          estAdmin && (
            <button onClick={() => lancer(null)} disabled={encours} style={{ ...boutonPrimaire, opacity: encours ? 0.6 : 1 }}>
              <Icon name="radar" size={15} />
              {encours ? "Collecte en cours…" : "Lancer une collecte"}
            </button>
          )
        }
      >
        Flux de bons plans
      </Titre>

      {erreur && (
        <div style={{ ...carte, borderColor: `${T.red}55`, color: T.red, fontSize: 12.5 }}>{erreur}</div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <Chiffre valeur={totalCollectes} libelle="offres collectées" icone="package" />
        <Chiffre valeur={totalPublies} libelle="publiées sur le site" ton={T.green} icone="check" />
        <Chiffre valeur={totalCollectes - totalPublies} libelle="retenues (expirées, écartées)" ton={T.muted} icone="lock" />
      </div>

      {/* Résultat de la dernière collecte manuelle. C'est ici qu'on lit
          qu'une source est ignorée faute de clé, plutôt que de le déduire
          d'une absence de résultats. */}
      {resultats && (
        <div style={{ ...carte }}>
          <Titre aide="Une source « ignorée » n'a pas d'identifiants configurés : elle se désactive d'elle-même sans faire échouer les autres.">
            Dernière collecte
          </Titre>
          <Tableau colonnes={["Source", "État", "Collectées", "Publiées"]}>
            {resultats.map((r) => (
              <tr key={r.nom}>
                <td style={{ ...cellule, fontWeight: 700 }}>{r.nom}</td>
                <td style={cellule}>
                  {r.ignoree ? (
                    <Puce ton={T.muted}>ignorée — pas de clé</Puce>
                  ) : r.ok ? (
                    <Puce ton={T.green}>collectée</Puce>
                  ) : (
                    <Puce ton={T.red}>{r.erreur || "échec"}</Puce>
                  )}
                </td>
                <td style={cellule}>{r.ignoree ? "—" : (r.collectes ?? 0)}</td>
                <td style={{ ...cellule, fontWeight: 800, color: r.publies > 0 ? T.green : T.muted }}>
                  {r.ignoree ? "—" : (r.publies ?? 0)}
                </td>
              </tr>
            ))}
          </Tableau>
          {resultats.some((r) => r.ok && r.collectes === 0) && (
            <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginTop: 12 }}>
              Une source qui répond correctement mais ne rapporte rien n'est pas en panne : sur un réseau
              d'affiliation, l'API ne renvoie que les offres des programmes déjà rejoints. Tant qu'aucun
              annonceur n'a validé ta candidature, la liste est légitimement vide.
            </p>
          )}
        </div>
      )}

      <div style={carte}>
        <Titre aide="Répartition de tout ce qui a été collecté depuis la mise en service, par détecteur et par nature.">
          Ce que chaque détecteur rapporte
        </Titre>
        {!stats ? (
          <Rien>Chargement…</Rien>
        ) : stats.length === 0 ? (
          <Rien>
            Aucune offre collectée pour l'instant. Lance une collecte : le détecteur des produits offerts
            fonctionne sans aucune clé et devrait rapporter quelque chose immédiatement.
          </Rien>
        ) : (
          <Tableau colonnes={["Détecteur", "Nature", "Total", "Publiées", "Retirées"]}>
            {stats.map((s) => {
              const d = DETECTEURS[s.detector] || { libelle: s.detector, ton: T.sub };
              return (
                <tr key={`${s.detector}-${s.type}`}>
                  <td style={cellule}>
                    <Puce ton={d.ton}>{s.detector}</Puce>{" "}
                    <span style={{ color: T.sub, fontSize: 11.5 }}>{d.libelle}</span>
                  </td>
                  <td style={cellule}>{s.type}</td>
                  <td style={cellule}>{s.total}</td>
                  <td style={{ ...cellule, color: T.green, fontWeight: 800 }}>{s.publies}</td>
                  <td style={{ ...cellule, color: T.muted }}>{s.retires}</td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </div>

      {/* Le jugement de la modération est la seule source de la précision :
          sans lui, l'indicateur reste « pas encore mesuré » indéfiniment, et
          la réputation des marchands n'apprend rien. */}
      <div style={carte}>
        <Titre aide="Marque chaque offre publiée comme justifiée ou non. C'est ce jugement — et lui seul — qui alimente la précision affichée dans Mesure et la réputation des marchands. Un faux positif quitte le site immédiatement.">
          Offres publiées, à juger
        </Titre>
        {!publies ? (
          <Rien>Chargement…</Rien>
        ) : publies.filter((d) => !juges[d.id]).length === 0 ? (
          <Rien>
            {publies.length === 0
              ? "Rien de publié pour l'instant — lance une collecte pour remplir le flux."
              : "Tout est jugé. Les indicateurs de la section Mesure sont à jour."}
          </Rien>
        ) : (
          <Tableau colonnes={["Offre", "Marchand", "Prix", "Nature", ""]}>
            {publies
              .filter((d) => !juges[d.id])
              .map((d) => (
                <tr key={d.id}>
                  <td style={{ ...cellule, fontWeight: 700, maxWidth: 280 }}>
                    <a href={d.url || "#"} target="_blank" rel="noopener noreferrer nofollow" style={{ color: T.ink, textDecoration: "none" }}>
                      {d.title}
                    </a>
                  </td>
                  <td style={{ ...cellule, color: T.sub }}>{d.merchant || "—"}</td>
                  <td style={{ ...cellule, fontWeight: 800 }}>
                    {d.price === 0 ? <span style={{ color: T.green }}>offert</span> : d.price != null ? `${Math.round(d.price)} €` : "—"}
                  </td>
                  <td style={cellule}>
                    <Puce ton={(DETECTEURS[d.detector] || {}).ton || T.sub}>{d.type}</Puce>
                  </td>
                  <td style={{ ...cellule, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => juger(d, "valide")} style={{ ...boutonSecondaire, color: T.green, borderColor: `${T.green}55`, marginRight: 6 }}>
                      Justifiée
                    </button>
                    <button onClick={() => juger(d, "faux_positif")} style={boutonDanger}>
                      Faux positif
                    </button>
                  </td>
                </tr>
              ))}
          </Tableau>
        )}
      </div>

      {estAdmin && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["D1", "D2"].map((d) => (
            <button key={d} onClick={() => lancer(d)} disabled={encours} style={boutonSecondaire}>
              Collecter {DETECTEURS[d].libelle.toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
