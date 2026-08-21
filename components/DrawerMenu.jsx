// DrawerMenu.jsx — Menu latéral mobile, ouvert par le bouton du même nom
// dans l'en-tête.
//
// Il existe pour une raison précise : la barre du bas ne tient que cinq
// entrées avant que les libellés ne deviennent illisibles, alors que le site
// en compte une quinzaine. Tout ce qui n'est pas un geste quotidien —
// sections secondaires, communauté, réglages, pages légales — vit donc ici.
//
// C'est ce qui a permis de supprimer l'onglet « Bons plans » sans rien perdre :
// il faisait doublon avec « Gros deals » et « Erreurs de prix », qui sont les
// vraies promesses du site et méritent leur place propre.
import { useEffect, useRef } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import useRadar, { depuis } from "./useRadar.js";

/* Le menu ne classe pas par thème, mais par ORIGINE.
 *
 * Les deux premiers intitulés se répondent : « Le radar » d'un côté, « La
 * communauté » de l'autre. L'opposition machine / humains se lit sans qu'on
 * ait besoin de l'expliquer — raison pour laquelle les notes explicatives
 * qui les accompagnaient ont été retirées : elles paraphrasaient un titre
 * qui se suffit à lui-même, et alourdissaient un menu qui se parcourt.
 *
 * C'est le point où RadarPrix se sépare des sites de bons plans habituels.
 * Ceux-ci rangent par catégories — high-tech, maison, mode — parce que tous
 * leurs deals viennent de la même source : leurs membres. Ici il y en a deux,
 * franchement différentes : ce qu'une machine a trouvé seule, et ce que des
 * gens ont signalé. Cette distinction est le produit lui-même ; la ranger
 * derrière des catégories la rendrait invisible.
 *
 * Un visiteur qui ouvre ce menu comprend en trois lignes ce que fait le site.
 */
const GROUPES = [
  {
    titre: "Le radar",
    entrees: [
      { key: "erreurs", icon: "alertCircle", label: "Erreurs de prix", compteur: "anomalies" },
      { key: "deals", icon: "trendingDown", label: "Gros deals", compteur: "deals" },
      { key: "occasion", icon: "refresh", label: "Occasion & reconditionné" },
    ],
  },
  {
    titre: "La communauté",
    entrees: [
      { key: "communaute-picks", icon: "gem", label: "Leurs deals" },
      { key: "forum", icon: "message", label: "Forum" },
      { key: "salon", icon: "users", label: "Salon" },
    ],
  },
  {
    // « Ce que je suis » se lisait d'abord comme le verbe être plutôt que
    // suivre — un contresens involontaire qu'on ne voit plus une fois écrit.
    titre: "Mon espace",
    entrees: [
      { key: "favoris", icon: "star", label: "Mes favoris", auth: true },
      { key: "profil", icon: "user", label: "Mon profil", auth: true },
      { key: "parametres", icon: "settings", label: "Paramètres", auth: true },
    ],
  },
];

/* Pages secondaires : présentées sans icône ni fond, pour qu'elles ne
   rivalisent pas visuellement avec la navigation réelle. */
const SECONDAIRES = [
  { key: "a-propos", label: "À propos" },
  { key: "faq", label: "Questions fréquentes" },
  { key: "contact", label: "Nous contacter" },
  { key: "cgu", label: "Conditions d'utilisation" },
  { key: "confidentialite", label: "Politique de confidentialité" },
];

export default function DrawerMenu({ ouvert, onFermer, onNavigate, connecte, admin, onDeconnexion }) {
  const panneau = useRef(null);
  const radar = useRadar();

  /* Fermeture au clavier : un menu qui recouvre l'écran doit pouvoir se
     refermer sans viser un bouton, en particulier pour qui navigue au clavier
     ou au lecteur d'écran. */
  useEffect(() => {
    if (!ouvert) return undefined;
    const surTouche = (e) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", surTouche);
    // Le fond ne doit pas défiler derrière le menu : c'est le défaut le plus
    // visible d'un tiroir mal fait sur mobile.
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panneau.current?.focus();
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = overflowInitial;
    };
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  const aller = (key) => {
    onFermer();
    onNavigate(key);
  };

  const entreeVisible = (e) => !e.auth || connecte;

  return (
    <div
      className="rp-drawer-fond"
      onClick={onFermer}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(3,6,12,0.72)",
        backdropFilter: "blur(3px)",
        display: "flex",
      }}
    >
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="rp-drawer"
        style={{
          width: "min(86vw, 340px)",
          height: "100%",
          overflowY: "auto",
          background: T.bg,
          borderRight: `1px solid ${T.line}`,
          display: "flex",
          flexDirection: "column",
          outline: "none",
        }}
      >
        {/* En-tête du tiroir */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px 14px",
            borderBottom: `1px solid ${T.line}`,
            position: "sticky",
            top: 0,
            background: T.bg,
            zIndex: 1,
          }}
        >
          <span className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>
            Menu
          </span>
          <button
            onClick={onFermer}
            aria-label="Fermer le menu"
            style={{
              background: "none",
              border: "none",
              color: T.sub,
              cursor: "pointer",
              padding: 6,
              display: "flex",
            }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ padding: "8px 12px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {GROUPES.map((groupe) => {
            const entrees = groupe.entrees.filter(entreeVisible);
            if (entrees.length === 0) return null;
            return (
              <div key={groupe.titre}>
                <p
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: ".09em",
                    textTransform: "uppercase",
                    color: T.muted,
                    margin: "0 0 7px 10px",
                  }}
                >
                  {groupe.titre}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {entrees.map((e) => (
                    <button
                      key={e.key}
                      onClick={() => aller(e.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderRadius: 10,
                        padding: "11px 10px",
                        cursor: "pointer",
                        color: T.ink,
                        fontSize: 14.5,
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      <Icon name={e.icon} size={18} color={T.sub} />
                      <span style={{ flex: 1 }}>{e.label}</span>
                      {/* Le compteur ne s'affiche qu'à partir de un : « 0 »
                          annoncerait un vide que la page dira mieux. */}
                      {e.compteur && radar?.[e.compteur] > 0 && (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: e.compteur === "anomalies" ? T.red : T.sub,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {radar[e.compteur]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {admin && (
            <div>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: ".09em",
                  textTransform: "uppercase",
                  color: T.muted,
                  margin: "0 0 6px 10px",
                }}
              >
                Administration
              </p>
              <button
                onClick={() => aller("admin")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 10px",
                  cursor: "pointer",
                  color: T.ink,
                  fontSize: 14.5,
                  fontWeight: 600,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <Icon name="shield" size={18} color={T.sub} />
                Panneau d'administration
              </button>
            </div>
          )}

          {/* Pages secondaires : volontairement discrètes. Elles doivent être
              trouvables, pas visibles. */}
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {SECONDAIRES.map((e) => (
                <button
                  key={e.key}
                  onClick={() => aller(e.key)}
                  style={{
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "9px 10px",
                    cursor: "pointer",
                    color: T.sub,
                    fontSize: 13.5,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── L'état du radar, en clair ──────────────────────────────
              Personne n'affiche ça, et c'est précisément l'intérêt. Un site
              qui promet de la fraîcheur devrait pouvoir la prouver plutôt que
              la répéter. Le jour où le radar tombe en panne, cette ligne le
              dit — et mieux vaut un visiteur informé qu'un visiteur trompé. */}
          {radar && (
            <div
              style={{
                borderTop: `1px solid ${T.line}`,
                paddingTop: 14,
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                padding: "14px 10px 0",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  marginTop: 5,
                  flexShrink: 0,
                  background: radar.actif ? T.green : T.muted,
                  boxShadow: radar.actif ? `0 0 0 3px ${T.green}22` : "none",
                }}
              />
              <p style={{ margin: 0, fontSize: 11.5, color: T.sub, lineHeight: 1.55 }}>
                {radar.actif ? (
                  <>
                    Dernier balayage <strong style={{ color: T.ink }}>{depuis(radar.dernierBalayage)}</strong>
                    {radar.fiches > 0 && <> · {radar.fiches} fiche{radar.fiches > 1 ? "s" : ""} sous surveillance</>}
                  </>
                ) : radar.fiches > 0 ? (
                  <>Radar en veille · {radar.fiches} fiche{radar.fiches > 1 ? "s" : ""} en attente de balayage</>
                ) : (
                  <>Radar en veille · aucune fiche sous surveillance</>
                )}
              </p>
            </div>
          )}

          {connecte && (
            <button
              onClick={() => {
                onFermer();
                onDeconnexion();
              }}
              style={{
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "11px 10px",
                cursor: "pointer",
                color: T.red,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
