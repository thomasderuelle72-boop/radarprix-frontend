// theme.js — Design tokens centralisés (couleurs, dégradés) pour tout le
// frontend RadarPrix. Source unique de vérité : RadarPrixSite.jsx et les
// composants extraits sous components/ importent tous T d'ici, pour éviter
// toute duplication ou dérive de palette entre fichiers.
export const T = {
  bg: "#0A0D16",
  surface: "#12151F",
  surface2: "#1A1F2E",
  ink: "#F2F4F8",
  sub: "#8B93A7",
  ember: "linear-gradient(90deg, #FF5A2C, #FFB13D)",
  emberSolid: "#FF6A35",
  red: "#FF3B30",
  pink: "#FF4D6D",
  green: "#2FD98B",
  yellow: "#FFC53D",
  purple: "#8B5CF6",
  line: "#232838",
};

// Marchands mis en avant en badges texte sur la homepage — mêmes noms que
// BIG_SELLERS côté backend (src/algorithm.js), pour rester cohérent avec
// le bonus de score qui leur est appliqué.
export const FEATURED_MERCHANTS = ["Amazon", "Cdiscount", "Boulanger", "Fnac", "Darty", "Carrefour"];
