// hunters.jsx — Les avatars « Radar Hunters » : un personnage composé
// couche par couche, serti dans un sceau hexagonal à balayage radar.
//
// Pourquoi un jeton et pas une image : `avatar_url` repart avec CHAQUE
// commentaire, message de salon et carte de deal. Une page de salon en
// affiche cent. Le personnage complet pèse ~2,4 ko en SVG ; son jeton en
// pèse 17. C'est la seule raison pour laquelle ce système tient dans le
// produit tel qu'il est construit.
//
// Le sceau hexagonal est le même que celui des badges de membres : avatars
// et badges forment une seule famille visuelle, et c'est ce qui rend un
// avatar reconnaissable comme « RadarPrix » avant même qu'on distingue le
// visage — à 20 px dans la barre du bas, il ne reste que lui.
//
// Les pièces sont des chaînes de balisage SVG plutôt que du JSX : elles
// sont composées par index, jamais à partir d'une saisie, et les écrire en
// JSX multiplierait par trois la longueur de ce fichier sans rien apporter.

/* ── Palette ────────────────────────────────────────────────────
   Reprise de theme.js. Une teinte dominante pilote le fond du sceau, le
   balayage et les touches de couleur du personnage : changer de couleur
   recolore l'avatar de façon cohérente, au lieu d'accorder au hasard. */
export const TEINTES = {
  braise: "#FF6A1A", cyan: "#00E5FF", menthe: "#35D475",
  or: "#FFD166", violet: "#8B5CF6", acier: "#7C8AA5",
};
export const NOMS_TEINTE = {
  braise: "Braise", cyan: "Cyan", menthe: "Menthe",
  or: "Or", violet: "Violet", acier: "Acier",
};
const CLES_TEINTE = Object.keys(TEINTES);

export const PEAUX = ["#F2D3BC", "#E0B195", "#C68A62", "#9C6340", "#6B4230", "#B9C4D4"];
export const NOMS_PEAU = ["Porcelaine", "Sable", "Ambre", "Bronze", "Ébène", "Chrome"];
export const CHEVEUX = ["#1B1F2A", "#3D2A1E", "#7A4B2A", "#C9A227", "#E8E4DE", "#2E4A7D"];
export const NOMS_CHEVEUX = ["Corbeau", "Châtain", "Cuivre", "Blond", "Platine", "Bleu nuit"];

// Paliers de rareté. Ils ne sont pas choisis : ils se gagneront à
// l'activité (voir les familles de badges dans src/badges.js du backend).
// Le jeton porte déjà le chiffre, pour que la progression puisse s'allumer
// plus tard sans changer le format.
const RARETES = [
  { nom: "Commun", couleur: null },
  { nom: "Éprouvé", couleur: "#35D475" },
  { nom: "Rare", couleur: "#8B5CF6" },
  { nom: "Épique", couleur: "#00E5FF" },
  { nom: "Légendaire", couleur: "#FF6A1A" },
];

const HEX = "60,4 11.5,32 11.5,88 60,116 108.5,88 108.5,32";

/* ── Les pièces ─────────────────────────────────────────────────
   Chaque entrée : un nom lisible, et une fonction qui rend son balisage.
   Toutes sont dessinées dans la même boîte de 120×120, avec des points
   d'ancrage communs — tête centrée en (60, 55), épaules à y = 95. Sans
   cette discipline, une coiffure sur deux flotterait au-dessus du crâne. */

export const VISAGES = [
  ["Rond", (u) => `<path d="M60 30c14 0 22 10 22 24 0 16-10 28-22 28S38 70 38 54c0-14 8-24 22-24Z" fill="url(#p${u})"/>`],
  ["Carré", (u) => `<path d="M41 34c0-3 3-5 6-5h26c3 0 6 2 6 5v26c0 12-8 22-19 22S41 72 41 60V34Z" fill="url(#p${u})"/>`],
  ["Ovale", (u) => `<ellipse cx="60" cy="55" rx="20" ry="26" fill="url(#p${u})"/>`],
  ["Anguleux", (u) => `<path d="M60 29 80 40v20L60 82 40 60V40Z" fill="url(#p${u})"/>`],
];

export const COIFFURES = [
  ["Courte", (c) => `<path d="M38 52c0-16 10-25 22-25s22 9 22 25c0-9-8-13-22-13s-22 4-22 13Z" fill="${c}"/>`],
  ["Crête", (c) => `<path d="M56 22h8c1 11 5 18 5 26-3-6-6-8-9-8s-6 2-9 8c0-8 4-15 5-26Z" fill="${c}"/><path d="M40 52c0-11 6-18 14-21-2 5-3 10-3 15-5 1-9 3-11 6Zm40 0c-2-3-6-5-11-6 0-5-1-10-3-15 8 3 14 10 14 21Z" fill="${c}"/>`],
  ["Chignon", (c) => `<path d="M38 54c0-17 10-27 22-27s22 10 22 27c0-10-8-15-22-15s-22 5-22 15Z" fill="${c}"/><circle cx="60" cy="21" r="8" fill="${c}"/>`],
  ["Longue", (c) => `<path d="M36 56c0-18 11-29 24-29s24 11 24 29v30h-8V56c0-8-7-13-16-13s-16 5-16 13v30h-8V56Z" fill="${c}"/>`],
  ["Rasée", (c) => `<path d="M38 50c0-14 10-23 22-23s22 9 22 23c0-8-8-12-22-12s-22 4-22 12Z" fill="${c}" opacity=".72"/>`],
  // Évidée : dessinée par-dessus le visage, une masse pleine mangerait le regard.
  ["Afro", (c) => `<path fill-rule="evenodd" d="M60 18a26 26 0 1 1 0 52 26 26 0 0 1 0-52Zm0 14c-11 0-18 9-18 22s7 24 18 24 18-11 18-24-7-22-18-22Z" fill="${c}"/>`],
  ["Tresses", (c) => `<path d="M38 52c0-16 10-25 22-25s22 9 22 25c0-9-8-13-22-13s-22 4-22 13Z" fill="${c}"/><path d="M36 52h7v34h-7Zm41 0h7v34h-7Z" fill="${c}"/><path d="M36 62h7M36 72h7M77 62h7M77 72h7" stroke="#0A0E16" stroke-width="1.6" opacity=".4"/>`],
  ["Undercut", (c) => `<path d="M38 50c0-15 10-24 22-24s22 9 22 24c0-7-8-11-22-11-9 0-15 2-19 5Z" fill="${c}"/><path d="M40 56c1-4 5-6 11-7" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`],
];

export const YEUX = [
  ["Ronds", () => `<circle cx="51" cy="56" r="3.4" fill="#10151F"/><circle cx="69" cy="56" r="3.4" fill="#10151F"/><circle cx="52.2" cy="54.8" r="1.2" fill="#fff"/><circle cx="70.2" cy="54.8" r="1.2" fill="#fff"/>`],
  ["Plissés", () => `<path d="M47 56h8M65 56h8" stroke="#10151F" stroke-width="3" stroke-linecap="round"/>`],
  ["Fente", (t) => `<rect x="46" y="54.4" width="10" height="3.2" rx="1.6" fill="${t}"/><rect x="64" y="54.4" width="10" height="3.2" rx="1.6" fill="${t}"/>`],
  // Verre translucide : opaque, la visière se lisait comme un bandeau.
  ["Visière", (t) => `<circle cx="51" cy="56" r="3.2" fill="#10151F"/><circle cx="69" cy="56" r="3.2" fill="#10151F"/><path d="M40 52h40v9a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6v-9Z" fill="${t}" opacity=".26"/><path d="M40 52h40v9a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6v-9Z" fill="none" stroke="${t}" stroke-width="1.6" opacity=".9"/>`],
  ["Œil-scanner", (t) => `<circle cx="51" cy="56" r="3.2" fill="#10151F"/><circle cx="69" cy="56" r="6.4" fill="#10151F"/><circle cx="69" cy="56" r="3.4" fill="${t}"/><circle cx="69" cy="56" r="1.3" fill="#fff"/>`],
  ["Mi-clos", () => `<path d="M47 57a4 4 0 0 1 8 0M65 57a4 4 0 0 1 8 0" fill="#10151F"/>`],
];

export const EXPRESSIONS = [
  ["Neutre", () => `<path d="M55 69h10" stroke="#10151F" stroke-width="2.4" stroke-linecap="round"/>`],
  ["Sourire", () => `<path d="M54 68c2 3.4 4 4.6 6 4.6s4-1.2 6-4.6" stroke="#10151F" stroke-width="2.4" stroke-linecap="round" fill="none"/>`],
  ["Concentré", () => `<path d="M55 70h10" stroke="#10151F" stroke-width="2.4" stroke-linecap="round"/><path d="M46 48l8 2M74 48l-8 2" stroke="#10151F" stroke-width="2" stroke-linecap="round"/>`],
  ["Malin", () => `<path d="M54 68c3 3.6 8 3.2 11 0" stroke="#10151F" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M46 49l8 1.6" stroke="#10151F" stroke-width="2" stroke-linecap="round"/>`],
  ["Sourcil levé", () => `<ellipse cx="60" cy="70" rx="3.4" ry="4" fill="#10151F"/><path d="M45 46l9 3" stroke="#10151F" stroke-width="2" stroke-linecap="round"/>`],
];

export const VETEMENTS = [
  ["Parka", (t) => `<path d="M32 116c0-13 12-21 28-21s28 8 28 21H32Z" fill="#1B2436"/><path d="M52 95l8 10 8-10" stroke="${t}" stroke-width="2.4" fill="none"/>`],
  ["Veste tech", (t) => `<path d="M32 116c0-13 12-21 28-21s28 8 28 21H32Z" fill="#232E44"/><rect x="56" y="97" width="8" height="19" fill="${t}" opacity=".55"/>`],
  ["Capuche", () => `<path d="M30 116c0-14 13-22 30-22s30 8 30 22H30Z" fill="#1A2233"/><path d="M44 96c5 8 11 11 16 11s11-3 16-11" stroke="#2C3852" stroke-width="4" fill="none"/>`],
  ["Combinaison", (t) => `<path d="M32 116c0-13 12-21 28-21s28 8 28 21H32Z" fill="#2A3550"/><circle cx="60" cy="104" r="4" fill="${t}"/>`],
  ["Trench", () => `<path d="M32 116c0-13 12-21 28-21s28 8 28 21H32Z" fill="#3A3020"/><path d="M46 97l14 8 14-8" stroke="#5A4A2E" stroke-width="3" fill="none"/>`],
  ["Gilet", (t) => `<path d="M32 116c0-13 12-21 28-21s28 8 28 21H32Z" fill="#1F2938"/><rect x="38" y="102" width="9" height="7" rx="2" fill="${t}" opacity=".5"/><rect x="73" y="102" width="9" height="7" rx="2" fill="${t}" opacity=".5"/>`],
  ["Blouson", (t) => `<path d="M32 116c0-13 12-21 28-21s28 8 28 21H32Z" fill="#2E2438"/><path d="M32 108h56" stroke="${t}" stroke-width="2.4" opacity=".45"/>`],
];

export const CHEFS = [
  ["Aucun", () => ""],
  ["Casquette", (t, c) => `<path d="M37 42c0-13 10-21 23-21s23 8 23 21H37Z" fill="${c}"/><path d="M83 42c8 0 14 2 14 5H60v-5h23Z" fill="${c}" opacity=".8"/>`],
  ["Bonnet", (t, c) => `<path d="M38 44c0-14 10-22 22-22s22 8 22 22H38Z" fill="${c}"/><rect x="36" y="42" width="48" height="7" rx="3.5" fill="${c}" opacity=".7"/>`],
  ["Casque", (t) => `<path d="M36 50c0-16 11-26 24-26s24 10 24 26v4H36v-4Z" fill="#2B3854"/><rect x="34" y="50" width="52" height="6" rx="3" fill="${t}" opacity=".85"/>`],
  ["Capuche", () => `<path d="M34 58c0-20 12-32 26-32s26 12 26 32c-4-12-12-18-26-18s-22 6-26 18Z" fill="#222C42"/>`],
  ["Visière", (t) => `<rect x="36" y="44" width="48" height="8" rx="4" fill="#1B2436"/><path d="M38 52h44v4a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8v-4Z" fill="${t}" opacity=".3"/>`],
  ["Oreillettes", (t) => `<path d="M36 52a24 24 0 0 1 48 0" stroke="#2B3854" stroke-width="5" fill="none"/><rect x="30" y="50" width="10" height="14" rx="5" fill="#2B3854"/><rect x="80" y="50" width="10" height="14" rx="5" fill="#2B3854"/><circle cx="35" cy="57" r="2.2" fill="${t}"/>`],
];

export const ACCESSOIRES = [
  ["Aucun", () => ""],
  ["Lunettes", (t) => `<circle cx="51" cy="56" r="7" fill="${t}" opacity=".14"/><circle cx="69" cy="56" r="7" fill="${t}" opacity=".14"/><circle cx="51" cy="56" r="7" fill="none" stroke="#0F1622" stroke-width="2.4"/><circle cx="69" cy="56" r="7" fill="none" stroke="#0F1622" stroke-width="2.4"/><path d="M58 56h4" stroke="#0F1622" stroke-width="2.4"/>`],
  ["Masque", (t) => `<path d="M42 62h36v8c0 7-8 12-18 12s-18-5-18-12v-8Z" fill="#1A2233"/><path d="M42 66h36" stroke="${t}" stroke-width="1.8" opacity=".6"/>`],
  ["Monocle HUD", (t) => `<circle cx="69" cy="56" r="9" fill="${t}" opacity=".16"/><circle cx="69" cy="56" r="9" fill="none" stroke="${t}" stroke-width="2"/><path d="M78 56h7" stroke="${t}" stroke-width="1.8"/><path d="M65 52h8M65 60h5" stroke="${t}" stroke-width="1.2" opacity=".8"/>`],
  ["Balafre", (t) => `<path d="M46 46l-3 18" stroke="${t}" stroke-width="1.8" stroke-linecap="round" opacity=".85"/><path d="M43 52h6" stroke="${t}" stroke-width="1.4" opacity=".6"/>`],
];

export const OBJETS = [
  ["Aucun", () => ""],
  ["Panier", (t) => `<path d="M74 90h19l-3 15H77Z" fill="#2C3852"/><path d="M77 90a7 7 0 0 1 14 0" stroke="${t}" stroke-width="2.4" fill="none"/>`],
  ["Loupe", (t) => `<circle cx="85" cy="86" r="9" fill="${t}" opacity=".13"/><circle cx="85" cy="86" r="9" fill="none" stroke="${t}" stroke-width="3"/><path d="M91.5 93l6.5 6.5" stroke="${t}" stroke-width="3.8" stroke-linecap="round"/>`],
  ["Scanner", (t) => `<rect x="74" y="84" width="21" height="15" rx="3" fill="#2C3852"/><path d="M79 89v6M84 89v6M89 89v6" stroke="${t}" stroke-width="1.9"/>`],
  ["Sac", (t) => `<path d="M76 84h17l-2 18H78Z" fill="#2C3852"/><path d="M80 84v-4a4.5 4.5 0 0 1 9 0v4" stroke="${t}" stroke-width="2.2" fill="none"/>`],
  ["Étiquette", (t) => `<path d="M75 82l14 2.4 2.4 14-14-2.4Z" fill="#2C3852"/><circle cx="80" cy="88" r="2.4" fill="${t}"/>`],
  ["Ticket", () => `<rect x="74" y="85" width="20" height="15" rx="2.4" fill="#E8E4DE"/><path d="M78 90h13M78 95h9" stroke="#2C3852" stroke-width="1.6"/>`],
];

export const MARQUES = [
  ["Balayage", (t) => `<path d="M60 60 60 14A46 46 0 0 1 100 37Z" fill="${t}" opacity=".13"/>`],
  ["Réticule", (t) => `<circle cx="94" cy="34" r="9" fill="none" stroke="${t}" stroke-width="1.6" opacity=".8"/><path d="M94 22v24M82 34h24" stroke="${t}" stroke-width="1.2" opacity=".55"/>`],
  ["Blip", (t) => `<circle cx="92" cy="38" r="3.4" fill="${t}"/><circle cx="92" cy="38" r="8" fill="none" stroke="${t}" stroke-width="1.4" opacity=".45"/>`],
  ["Grille", (t) => `<g opacity=".22">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${16 + i * 15} 8v104" stroke="${t}" stroke-width=".8"/>`).join("")}${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M4 ${16 + i * 15}h112" stroke="${t}" stroke-width=".8"/>`).join("")}</g>`],
  ["Onde", (t) => `<g opacity=".5" fill="none" stroke="${t}"><circle cx="60" cy="60" r="18" stroke-width="1.2"/><circle cx="60" cy="60" r="32" stroke-width="1"/><circle cx="60" cy="60" r="46" stroke-width=".8"/></g>`],
];

export const EFFETS = [
  ["Aucun", () => ""],
  ["Particules", (t) => [[28, 30, 1.8], [92, 28, 1.4], [24, 84, 1.6], [98, 80, 2], [46, 20, 1.2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${t}" opacity=".7"/>`).join("")],
  ["Halo", (t) => `<circle cx="60" cy="56" r="34" fill="${t}" opacity=".1"/>`],
  ["Scanline", (t) => `<g opacity=".26">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<path d="M6 ${14 + i * 10}h108" stroke="${t}" stroke-width=".9"/>`).join("")}</g>`],
  ["Éclat", (t) => `<path d="M96 24l2.6 6.4L105 33l-6.4 2.6L96 42l-2.6-6.4L87 33l6.4-2.6Z" fill="${t}" opacity=".85"/>`],
];

// Glyphes du repli, sous 48 px : le personnage disparaît, la marque reste.
// Ce sont des marques de radar, jamais des symboles d'interface — une croix
// ou une coche se lirait comme un bouton « fermer » ou « valider » dans une
// barre de navigation, pas comme un avatar.
const GLYPHES = [
  "M60 34v52M34 60h52",                                  // réticule
  "M38 72a24 24 0 0 1 44-20",                            // arc de balayage
  "M60 36 82 60 60 84 38 60Z",                           // losange
  "M40 68a20 20 0 0 1 40 0M48 78a12 12 0 0 1 24 0",      // ondes
  "M60 34v52M42 52l18-18 18 18",                         // cap
];

/* Ordre des couches dans le jeton. Il ne doit jamais changer : un jeton
   déjà enregistré en base se relirait de travers. Ajouter une couche se
   fait en fin de liste, jamais au milieu. */
const COUCHES = [
  ["visage", VISAGES], ["peau", PEAUX], ["coiffure", COIFFURES], ["cheveux", CHEVEUX],
  ["yeux", YEUX], ["expression", EXPRESSIONS], ["vetement", VETEMENTS], ["chef", CHEFS],
  ["accessoire", ACCESSOIRES], ["objet", OBJETS], ["marque", MARQUES], ["effet", EFFETS],
  ["teinte", CLES_TEINTE], ["rarete", RARETES],
];

/** Règles d'accord. Sans elles, une combinaison sur six masque entièrement
 *  le visage — casque intégral avec des mèches qui traversent le métal,
 *  masque sur une bouche qui sourit. */
export function accorder(c) {
  const a = { ...c };
  if (a.chef === 3) a.coiffure = 4;              // casque intégral : crâne rasé
  if (a.accessoire === 2) a.expression = 0;      // masque : la bouche est cachée
  if (a.yeux === 3 && a.chef !== 0) a.chef = 0;  // visière : le haut du visage est pris
  return a;
}

/* ── Jeton ──────────────────────────────────────────────────────
   Quatorze indices, un caractère base36 chacun : « rh:0304120500120 ».
   Dix-sept octets, contre ~2 400 pour le même avatar transporté en SVG.
   Sur une page de salon de cent messages, 1,7 ko au lieu de 240 ko. */
const JETON = /^rh:[0-9a-z]{14}$/;

export const estHunter = (v) => typeof v === "string" && v.startsWith("rh:");

export function jetonHunter(c) {
  return "rh:" + COUCHES.map(([cle]) => (c[cle] || 0).toString(36)).join("");
}

/** Décode un jeton. Renvoie null si la forme ou un index est invalide —
 *  un avatar mal formé doit retomber sur l'initiale colorée, jamais
 *  laisser un trou dans la page. */
export function lireHunter(valeur) {
  if (!JETON.test(valeur || "")) return null;
  const chiffres = valeur.slice(3).split("");
  const c = {};
  for (let i = 0; i < COUCHES.length; i++) {
    const [cle, liste] = COUCHES[i];
    const n = parseInt(chiffres[i], 36);
    if (!Number.isInteger(n) || n >= liste.length) return null;
    c[cle] = n;
  }
  return accorder(c);
}

/** Tirage déterministe : la même graine donne toujours le même chasseur,
 *  sur toutes les machines. */
function alea(graine) {
  let a = graine >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/** Un chasseur au hasard. La rareté reste à zéro : elle se gagnera, elle
 *  ne se tire pas — sinon elle ne vaudrait rien. */
export function tirerHunter(graine) {
  const r = alea(hash(graine === undefined ? Math.random() : graine));
  const c = {};
  for (const [cle, liste] of COUCHES) c[cle] = Math.floor(r() * liste.length);
  c.rarete = 0;
  return accorder(c);
}

const assombrir = (hex, k) => {
  const v = parseInt(hex.slice(1), 16);
  const f = (x) => Math.max(0, Math.min(255, Math.round(x * k)));
  return "#" + [f(v >> 16), f((v >> 8) & 255), f(v & 255)].map((x) => x.toString(16).padStart(2, "0")).join("");
};

/* Compteur d'instances : chaque avatar a besoin d'identifiants de dégradé
   qui lui sont propres. Deux avatars partageant un id « peau » verraient
   le navigateur résoudre le premier pour les deux. */
let instance = 0;

/** Construit le balisage intérieur du sceau. */
function baliser(c, taille, uid) {
  const t = TEINTES[CLES_TEINTE[c.teinte]];
  const peau = PEAUX[c.peau];
  const cheveux = CHEVEUX[c.cheveux];

  let g = `<polygon points="${HEX}" fill="url(#f${uid})"/>
    <circle cx="60" cy="60" r="40" fill="none" stroke="${t}" stroke-width="1" opacity=".2"/>
    <circle cx="60" cy="60" r="26" fill="none" stroke="${t}" stroke-width="1" opacity=".14"/>
    ${MARQUES[c.marque][1](t)}`;

  if (taille < 48) {
    // Repli : à cette taille un visage devient une tache. On garde ce qui
    // se lit encore — le sceau, la teinte, un glyphe.
    g += `<path d="${GLYPHES[c.visage % GLYPHES.length]}" stroke="${t}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".95"/>`;
    return g;
  }

  return g
    + VETEMENTS[c.vetement][1](t)
    + `<path d="M54 74h12v16H54Z" fill="${assombrir(peau, .74)}"/>`
    + VISAGES[c.visage][1](uid)
    // La coiffure passe APRÈS le visage : dessinée avant, une coupe qui
    // épouse le crâne était intégralement recouverte et invisible.
    + COIFFURES[c.coiffure][1](cheveux)
    + YEUX[c.yeux][1](t)
    + EXPRESSIONS[c.expression][1]()
    + CHEFS[c.chef][1](t, cheveux)
    + ACCESSOIRES[c.accessoire][1](t)
    + OBJETS[c.objet][1](t)
    + EFFETS[c.effet][1](t);
}

/**
 * Rend un chasseur. `jeton` est la valeur stockée en base ; renvoie null
 * s'il est illisible, pour laisser Avatar.jsx retomber sur l'initiale.
 */
export default function AvatarHunter({ jeton, size = 32, titre }) {
  const c = lireHunter(jeton);
  if (!c) return null;

  const uid = `h${instance++}`;
  const t = TEINTES[CLES_TEINTE[c.teinte]];
  const peau = PEAUX[c.peau];
  // Tant que la rareté n'est pas gagnée, le cadre suit la teinte choisie :
  // un cadre gris pour tout le monde perdrait la moitié de l'attrait, et
  // laisser choisir sa rareté la viderait de son sens.
  const cadre = RARETES[c.rarete].couleur || t;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={titre || "Avatar"}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id={`c${uid}`}><polygon points={HEX} /></clipPath>
        <linearGradient id={`p${uid}`} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor={peau} />
          <stop offset="1" stopColor={assombrir(peau, .82)} />
        </linearGradient>
        <radialGradient id={`f${uid}`} cx=".5" cy=".38" r=".72">
          <stop offset="0" stopColor={t} stopOpacity=".26" />
          <stop offset="1" stopColor="#070B14" stopOpacity=".95" />
        </radialGradient>
      </defs>
      {/* Le balisage vient de notre registre, indexé par des entiers
          validés à la lecture du jeton : aucune saisie ne l'atteint. */}
      <g clipPath={`url(#c${uid})`} dangerouslySetInnerHTML={{ __html: baliser(c, size, uid) }} />
      <polygon points={HEX} fill="none" stroke={cadre} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}
