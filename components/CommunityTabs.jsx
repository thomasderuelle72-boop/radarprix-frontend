// CommunityTabs.jsx — Sous-navigation de l'espace communauté.
//
// Les trois sous-pages (choix de la communauté, salon, forum) n'étaient
// atteignables que par le menu déroulant "Communauté" de la barre du haut.
// Or cette barre est masquée sous 640 px : sur téléphone, l'onglet
// Communauté menait toujours au choix de la communauté, et ni le salon ni
// le forum n'étaient accessibles du tout.
//
// Les onglets vivent maintenant dans la section elle-même : on change de
// sous-page là où on est déjà, sans remonter dans un menu — ce qui évite
// aussi un aller-retour sur ordinateur.
import { T } from "../theme.js";
import Icon from "./Icon.jsx";

const SOUS_PAGES = [
  { vue: "communaute-picks", libelle: "Choix de la communauté", court: "Deals", icone: "trophy" },
  { vue: "communaute-chat", libelle: "Salon général", court: "Salon", icone: "message" },
  { vue: "communaute-forum", libelle: "Forum", court: "Forum", icone: "users" },
];

export default function CommunityTabs({ courante, onNavigate }) {
  return (
    <nav
      className="rp-scroll-x"
      aria-label="Sections de la communauté"
      style={{
        display: "flex", gap: 6, overflowX: "auto", marginBottom: 22,
        background: T.surface2, border: `1px solid ${T.line}`,
        borderRadius: 12, padding: 5,
      }}
    >
      {SOUS_PAGES.map((p) => {
        // Le fil d'un sujet fait partie du forum : l'onglet doit rester
        // allumé quand on est descendu dans une discussion.
        const actif = courante === p.vue || (p.vue === "communaute-forum" && courante === "communaute-forum-thread");
        return (
          <button
            key={p.vue}
            onClick={() => !actif && onNavigate(p.vue)}
            aria-current={actif ? "page" : undefined}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              flex: 1, minWidth: "max-content", whiteSpace: "nowrap",
              padding: "9px 14px", borderRadius: 8, border: "none", cursor: actif ? "default" : "pointer",
              background: actif ? T.ember : "transparent",
              color: actif ? "#0C0E14" : T.sub,
              fontWeight: actif ? 900 : 700, fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              transition: "background .15s ease, color .15s ease",
            }}
          >
            <Icon name={p.icone} size={15} />
            {/* Intitulé complet sur écran large, abrégé sur téléphone : les
                trois onglets doivent tenir sans défilement horizontal. */}
            <span className="rp-tab-long">{p.libelle}</span>
            <span className="rp-tab-short">{p.court}</span>
          </button>
        );
      })}
    </nav>
  );
}
