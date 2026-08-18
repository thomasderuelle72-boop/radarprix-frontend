// theme.js — Design tokens centralisés (couleurs, dégradés) pour tout le
// frontend RadarPrix. Source unique de vérité : RadarPrixSite.jsx et les
// composants extraits sous components/ importent tous T d'ici, pour éviter
// toute duplication ou dérive de palette entre fichiers.
// Valeurs alignées sur la charte graphique validée (public/design-system/11_TOKENS/tokens.css) :
// dark navy premium, orange RadarPrix, rose/rouge anomalies, violet accents, vert succès.
export const T = {
  bg: "#070B14",
  bgElevated: "#0A1020",
  surface: "#0D1422",
  surface2: "#11182A",
  surface3: "#151F31",
  ink: "#F6F7FB",
  sub: "#98A3B8",
  muted: "#66738A",
  ember: "linear-gradient(135deg, #FF5F2E 0%, #FF9E2C 100%)",
  emberSolid: "#FF6A1A",
  emberLight: "#FFA125",
  red: "#FF345D",
  pink: "#FF3D7F",
  green: "#35D475",
  yellow: "#FFD166",
  purple: "#8B5CF6",
  cyan: "#00E5FF",
  line: "#202A3B",
  lineSoft: "rgba(122,145,184,.16)",
  gradDanger: "linear-gradient(135deg, #FF315D 0%, #E63779 100%)",
  gradSurface: "linear-gradient(180deg, #101827 0%, #0B121F 100%)",
  radiusSm: 9,
  radiusMd: 13,
  radiusLg: 17,
  radiusXl: 22,
  shadowCard: "0 16px 45px rgba(0,0,0,.22)",
  shadowCardHover: "0 22px 60px rgba(0,0,0,.30)",
  fontDisplay: "'Unbounded', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
};

// Marchands mis en avant en badges texte sur la homepage — mêmes noms que
// BIG_SELLERS côté backend (src/algorithm.js), pour rester cohérent avec
// le bonus de score qui leur est appliqué.
export const FEATURED_MERCHANTS = ["Amazon", "Cdiscount", "Boulanger", "Fnac", "Darty", "Carrefour"];

// Catégories de produits — partagées entre la recherche, la grille homepage
// et le fil d'ariane de la fiche produit.
export const CATEGORIES = [
  { id: "tout", label: "Toutes catégories" },
  { id: "hightech", label: "High-tech / Informatique" },
  { id: "gaming", label: "Gaming / PC gamer" },
  { id: "maison", label: "Maison / Électroménager" },
  { id: "mode", label: "Mode / Vêtements" },
  { id: "beaute", label: "Beauté / Hygiène" },
  { id: "alimentaire", label: "Alimentaire / Boissons" },
  { id: "sport", label: "Sport / Plein air" },
  { id: "auto", label: "Auto / Moto" },
];
