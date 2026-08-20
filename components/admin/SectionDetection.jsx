// SectionDetection.jsx — Réglages de l'algorithme, liste noire, anomalies
// écartées et catalogue scanné.
//
// C'est la section qui répond à la plainte de départ : « ça annonce un
// téléphone et c'est une coque ». Les seuils vivaient en constantes dans le
// code, et un faux positif visible en ligne n'avait aucun recours.
import { useState, useEffect } from "react";
import { T } from "../../theme.js";
import Icon from "../Icon.jsx";
import {
  apiAdminSettings, apiAdminSetSetting,
  apiAdminBlacklist, apiAdminBlacklistAdd, apiAdminBlacklistDel,
  apiAdminRejets, apiAdminAnnulerRejet,
  apiAdminCatalog, apiAdminCatalogAdd, apiAdminCatalogToggle, apiAdminCatalogDel,
} from "../../api.js";
import { relativeTime } from "../../utils.js";
import { CATEGORIES } from "../../theme.js";
import { carte, Titre, Tableau, cellule, Rien, Puce, champ, boutonPrimaire, boutonSecondaire, boutonDanger, confirmer } from "./ui.jsx";

export default function SectionDetection({ token, estAdmin }) {
  return (
    <>
      {estAdmin && <Reglages token={token} />}
      <ListeNoire token={token} />
      <Rejets token={token} />
      {estAdmin && <Catalogue token={token} />}
    </>
  );
}

/* ── Seuils de l'algorithme ─────────────────────────────────────── */
function Reglages({ token }) {
  const [items, setItems] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);

  useEffect(() => { apiAdminSettings(token).then((d) => setItems(d.items)).catch((e) => setErreur(e.message)); }, [token]);

  const changer = async (cle, valeur) => {
    setEnCours(cle);
    setErreur(null);
    try {
      setItems((await apiAdminSetSetting(token, cle, valeur)).items);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(null);
    }
  };

  return (
    <div style={carte}>
      <Titre aide="Ces seuils décidaient auparavant en dur dans le code. Un réglage modifié est signalé ; le remettre à sa valeur d'origine se fait en un clic.">
        Réglages de la détection
      </Titre>
      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
      {items === null && <Rien>Chargement…</Rien>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items?.map((r) => (
          <div key={r.cle} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>{r.libelle}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                de {r.min} à {r.max} · valeur d'origine {r.defaut}
                {r.modifie && <span style={{ color: T.yellow, fontWeight: 800 }}> · modifié</span>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={r.min}
                max={r.max}
                defaultValue={r.valeur}
                key={`${r.cle}-${r.valeur}`}
                disabled={enCours === r.cle}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n !== r.valeur) changer(r.cle, n);
                }}
                style={{ ...champ, width: 84, textAlign: "center" }}
              />
              {r.modifie && (
                <button onClick={() => changer(r.cle, null)} style={{ ...boutonSecondaire, padding: "7px 11px" }}>
                  <Icon name="refresh" size={13} /> Rétablir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Liste noire ────────────────────────────────────────────────── */
function ListeNoire({ token }) {
  const [items, setItems] = useState(null);
  const [type, setType] = useState("marchand");
  const [valeur, setValeur] = useState("");
  const [erreur, setErreur] = useState(null);

  useEffect(() => { apiAdminBlacklist(token).then((d) => setItems(d.items)).catch((e) => setErreur(e.message)); }, [token]);

  const ajouter = async (e) => {
    e.preventDefault();
    if (!valeur.trim()) return;
    setErreur(null);
    try {
      setItems((await apiAdminBlacklistAdd(token, type, valeur.trim())).items);
      setValeur("");
    } catch (e2) {
      setErreur(e2.message);
    }
  };

  const retirer = async (id) => {
    try {
      setItems((await apiAdminBlacklistDel(token, id)).items);
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <div style={carte}>
      <Titre aide="Un marchand entier, ou un mot présent dans un titre. S'applique à tout ce qui passe par le filtrage, scan planifié comme recherche en direct.">
        Liste noire
      </Titre>

      <form onSubmit={ajouter} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...champ, flex: "0 0 150px" }}>
          <option value="marchand">Marchand</option>
          <option value="motif">Mot dans le titre</option>
        </select>
        <input
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={type === "marchand" ? "ex : VendeurDouteux" : "ex : coque"}
          style={{ ...champ, flex: "1 1 220px" }}
        />
        <button type="submit" style={boutonPrimaire}><Icon name="shield" size={14} /> Bannir</button>
      </form>

      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
      {items === null && <Rien>Chargement…</Rien>}
      {items?.length === 0 && <Rien>Rien de banni. Le filtrage automatique s'occupe déjà des accessoires et de l'occasion.</Rien>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items?.map((b) => (
          <span
            key={b.id}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: T.surface2, border: `1px solid ${T.line}`,
              borderRadius: 999, padding: "6px 8px 6px 12px", fontSize: 12.5, color: T.ink,
            }}
          >
            <Puce ton={b.type === "marchand" ? T.red : T.yellow}>{b.type}</Puce>
            {b.valeur}
            <button
              onClick={() => retirer(b.id)}
              aria-label={`Retirer ${b.valeur}`}
              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Anomalies écartées à la main ───────────────────────────────── */
function Rejets({ token }) {
  const [items, setItems] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { apiAdminRejets(token).then((d) => setItems(d.items)).catch((e) => setErreur(e.message)); }, [token]);

  const annuler = async (id) => {
    try {
      await apiAdminAnnulerRejet(token, id);
      setItems((await apiAdminRejets(token)).items);
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <div style={carte}>
      <Titre aide="Ces offres ne sont plus publiées. Le rejet vise un produit, un marchand et un prix précis : une autre offre du même produit reste affichée.">
        Anomalies écartées
      </Titre>
      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
      {items === null && <Rien>Chargement…</Rien>}
      {items?.length === 0 && (
        <Rien>
          Aucune anomalie écartée. Le bouton « Écarter » apparaît sur chaque deal de la page
          « Erreurs de prix » quand tu es connecté en administrateur.
        </Rien>
      )}
      {items?.length > 0 && (
        <Tableau colonnes={["Produit", "Marchand", "Prix", "Motif", "Écarté", ""]}>
          {items.map((r) => (
            <tr key={r.id}>
              <td style={{ ...cellule, maxWidth: 260 }}>{r.produit || r.product_key}</td>
              <td style={{ ...cellule, color: T.sub }}>{r.seller || "—"}</td>
              <td style={{ ...cellule, whiteSpace: "nowrap" }}>{Number(r.price).toFixed(2)} €</td>
              <td style={{ ...cellule, color: T.sub }}>{r.motif || "—"}</td>
              <td style={{ ...cellule, color: T.muted, whiteSpace: "nowrap" }}>
                {relativeTime(r.created_at)} · {r.rejete_par}
              </td>
              <td style={cellule}>
                <button onClick={() => annuler(r.id)} style={{ ...boutonSecondaire, padding: "6px 10px" }}>
                  Remettre
                </button>
              </td>
            </tr>
          ))}
        </Tableau>
      )}
    </div>
  );
}

/* ── Catalogue scanné ───────────────────────────────────────────── */
function Catalogue({ token }) {
  const [data, setData] = useState(null);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("hightech");
  const [erreur, setErreur] = useState(null);

  useEffect(() => { apiAdminCatalog(token).then(setData).catch((e) => setErreur(e.message)); }, [token]);

  const rafraichir = (ajoutes) => setData((d) => ({ ...d, ajoutes }));

  const ajouter = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setErreur(null);
    try {
      rafraichir((await apiAdminCatalogAdd(token, nom.trim(), categorie)).ajoutes);
      setNom("");
    } catch (e2) {
      setErreur(e2.message);
    }
  };

  return (
    <div style={carte}>
      <Titre aide="Le fichier catalog.js reste la référence et n'est pas modifiable ici. Les produits ajoutés depuis cette page entrent dans la rotation dès le scan suivant.">
        Catalogue scanné
      </Titre>

      <form onSubmit={ajouter} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Modèle précis — ex : Dyson V15 Detect Absolute"
          style={{ ...champ, flex: "1 1 280px" }}
        />
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ ...champ, flex: "0 0 190px" }}>
          {CATEGORIES.filter((c) => c.id !== "tout").map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <button type="submit" style={boutonPrimaire}><Icon name="package" size={14} /> Ajouter</button>
      </form>

      <p style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
        Un modèle précis, jamais une catégorie vague : « Vélo électrique » remonte des produits
        différents qui ne peuvent pas être comparés entre eux, et fausse toute la détection.
      </p>

      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>}
      {data === null && <Rien>Chargement…</Rien>}

      {data && (
        <>
          <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 12 }}>
            <strong style={{ color: T.ink }}>{data.fichier.length}</strong> produits dans le fichier ·{" "}
            <strong style={{ color: T.ink }}>{data.ajoutes.length}</strong> ajouté(s) depuis cette page
          </div>

          {data.ajoutes.length === 0 && <Rien>Aucun produit ajouté à la main pour l'instant.</Rien>}
          {data.ajoutes.length > 0 && (
            <Tableau colonnes={["Produit", "Catégorie", "État", "Ajouté", ""]}>
              {data.ajoutes.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...cellule, opacity: c.actif ? 1 : 0.5 }}>{c.name}</td>
                  <td style={{ ...cellule, color: T.sub }}>{c.category}</td>
                  <td style={cellule}>
                    <Puce ton={c.actif ? T.green : T.muted}>{c.actif ? "scanné" : "en pause"}</Puce>
                  </td>
                  <td style={{ ...cellule, color: T.muted, whiteSpace: "nowrap" }}>
                    {relativeTime(c.created_at)} · {c.ajoute_par}
                  </td>
                  <td style={cellule}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={async () => rafraichir((await apiAdminCatalogToggle(token, c.id, !c.actif)).ajoutes)}
                        style={{ ...boutonSecondaire, padding: "6px 10px" }}
                      >
                        {c.actif ? "Mettre en pause" : "Réactiver"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirmer(`Retirer « ${c.name} » du catalogue ?`)) return;
                          rafraichir((await apiAdminCatalogDel(token, c.id)).ajoutes);
                        }}
                        style={{ ...boutonDanger, padding: "6px 10px" }}
                      >
                        Retirer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Tableau>
          )}
        </>
      )}
    </div>
  );
}
