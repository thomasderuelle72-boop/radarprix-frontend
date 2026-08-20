// FeedView.jsx — Le flux unifié des bons plans, et sa déclinaison occasion.
//
// Cette vue est la traduction visible du changement d'architecture côté
// serveur : le site ne montrait jusqu'ici que des anomalies de prix, alors
// que la majorité des bons plans qui intéressent les visiteurs — codes
// promo, produits offerts, offres de remboursement — ne se manifestent pas
// dans le prix affiché et n'existaient donc nulle part.
import { useEffect, useState, useCallback } from "react";
import { T, CATEGORIES } from "../theme.js";
import PageShell from "./PageShell.jsx";
import FeedCard, { NATURES } from "./FeedCard.jsx";
import Icon from "./Icon.jsx";
import { apiFeed, apiFeedOccasion } from "../api.js";

// L'ordre est délibéré : « Gratuit » et « Erreurs de prix » d'abord, parce
// que ce sont les deux raisons pour lesquelles on vient sur ce genre de site.
const FILTRES = [
  { id: "tout", label: "Tout" },
  { id: "gratuit", label: "Gratuit" },
  { id: "erreur", label: "Erreurs de prix" },
  { id: "code", label: "Codes promo" },
  { id: "promo", label: "Promotions" },
  { id: "odr", label: "Remboursements" },
];

function Puce({ actif, onClick, children, couleur = T.emberSolid }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={actif}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        border: `1px solid ${actif ? couleur : T.line}`,
        background: actif ? `${couleur}1c` : "transparent",
        color: actif ? couleur : T.sub,
        fontSize: 13, fontWeight: 800, cursor: "pointer",
        fontFamily: T.fontBody, whiteSpace: "nowrap",
        transition: "border-color .15s ease, background .15s ease, color .15s ease",
      }}
    >
      {children}
    </button>
  );
}

function Vide({ filtre }) {
  const nature = NATURES[filtre];
  return (
    <div
      style={{
        textAlign: "center", padding: "48px 20px",
        border: `1px dashed ${T.line}`, borderRadius: T.radiusLg, color: T.sub,
      }}
    >
      <Icon name="radar" size={30} />
      <p style={{ margin: "12px 0 4px", fontWeight: 800, color: T.ink, fontSize: 15 }}>
        Rien à signaler pour l'instant
      </p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
        {nature
          ? `Aucun bon plan de type « ${nature.label.toLowerCase()} » n'est actif en ce moment.`
          : "Le radar tourne en continu. Les bons plans apparaîtront ici dès qu'ils seront détectés."}
      </p>
    </div>
  );
}

/**
 * @param {object} props
 * @param {boolean} [props.occasion] - affiche la section reconditionné plutôt
 *   que le flux principal. Les deux univers restent séparés : une offre
 *   reconditionnée est légitimement moins chère qu'un produit neuf, les
 *   mélanger reviendrait à afficher en permanence de fausses bonnes affaires.
 */
export default function FeedView({ onBack, occasion = false }) {
  const [filtre, setFiltre] = useState("tout");
  const [categorie, setCategorie] = useState("tout");
  const [etat, setEtat] = useState("reconditionne");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(
    async (numeroPage) => {
      setChargement(true);
      setErreur(null);
      try {
        const data = occasion
          ? await apiFeedOccasion({ etat, category: categorie, page: numeroPage })
          : await apiFeed({ type: filtre, category: categorie, page: numeroPage });
        // Page 1 remplace, les suivantes complètent : sans ce test, changer
        // de filtre empilerait les résultats des deux filtres.
        setItems((prec) => (numeroPage === 1 ? data.items : [...prec, ...data.items]));
        setHasMore(data.hasMore);
      } catch (e) {
        setErreur(e.message);
      } finally {
        setChargement(false);
      }
    },
    [occasion, filtre, categorie, etat]
  );

  // Tout changement de filtre repart de la première page.
  useEffect(() => {
    setPage(1);
    charger(1);
  }, [charger]);

  const chargerPlus = () => {
    const suivante = page + 1;
    setPage(suivante);
    charger(suivante);
  };

  return (
    <PageShell
      icon={occasion ? "refresh" : "flame"}
      iconColor={occasion ? T.steel : T.emberSolid}
      title={occasion ? "Occasion & reconditionné" : "Bons plans"}
      subtitle={
        occasion
          ? "Un marché à part entière, comparé à lui-même — jamais au prix du neuf."
          : "Erreurs de prix, produits offerts, codes promo et promotions, réunis au même endroit."
      }
      onBack={onBack}
      width={860}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Filtres par nature (flux principal) ou par état (occasion) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {occasion ? (
            <>
              <Puce actif={etat === "reconditionne"} onClick={() => setEtat("reconditionne")} couleur={T.steel}>
                Reconditionné
              </Puce>
              <Puce actif={etat === "occasion"} onClick={() => setEtat("occasion")} couleur={T.steel}>
                Occasion
              </Puce>
            </>
          ) : (
            FILTRES.map((f) => (
              <Puce
                key={f.id}
                actif={filtre === f.id}
                onClick={() => setFiltre(f.id)}
                couleur={NATURES[f.id]?.couleur || T.emberSolid}
              >
                {f.label}
              </Puce>
            ))
          )}
        </div>

        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          aria-label="Filtrer par catégorie"
          style={{
            alignSelf: "flex-start",
            padding: "8px 12px", borderRadius: T.radiusSm,
            background: T.surface2, color: T.ink,
            border: `1px solid ${T.line}`, fontSize: 13, fontWeight: 700,
            fontFamily: T.fontBody, cursor: "pointer",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {erreur && (
          <div
            role="alert"
            style={{
              padding: 14, borderRadius: T.radiusSm,
              background: "rgba(255,52,93,.10)", border: `1px solid ${T.red}44`, color: T.ink, fontSize: 13,
            }}
          >
            {erreur}
          </div>
        )}

        {items.length === 0 && !chargement && !erreur && <Vide filtre={filtre === "tout" ? null : filtre} />}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((d, i) => (
            <FeedCard key={d.id} deal={d} index={i} />
          ))}
        </div>

        {chargement && (
          <p style={{ textAlign: "center", color: T.sub, fontSize: 13, padding: 16 }}>Chargement…</p>
        )}

        {hasMore && !chargement && (
          <button
            onClick={chargerPlus}
            style={{
              alignSelf: "center", padding: "10px 22px", borderRadius: T.radiusSm,
              background: "transparent", border: `1px solid ${T.line}`, color: T.ink,
              fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: T.fontBody,
            }}
          >
            Voir plus
          </button>
        )}
      </div>
    </PageShell>
  );
}
