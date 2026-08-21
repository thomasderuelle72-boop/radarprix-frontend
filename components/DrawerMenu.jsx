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

/* Groupes du menu. L'ordre suit ce qu'un visiteur cherche réellement :
   d'abord parcourir, puis la communauté, puis son compte, puis les pages
   qu'on ne consulte qu'une fois. */
const GROUPES = [
  {
    titre: "Parcourir",
    entrees: [
      { key: "deals", icon: "trendingDown", label: "Gros deals" },
      { key: "erreurs", icon: "alertCircle", label: "Erreurs de prix" },
      { key: "occasion", icon: "refresh", label: "Occasion & reconditionné" },
    ],
  },
  {
    titre: "Communauté",
    entrees: [
      { key: "communaute-picks", icon: "gem", label: "Deals des membres" },
      { key: "forum", icon: "message", label: "Forum" },
      { key: "salon", icon: "users", label: "Salon" },
    ],
  },
  {
    titre: "Mon compte",
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
                    margin: "0 0 6px 10px",
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
                      {e.label}
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
