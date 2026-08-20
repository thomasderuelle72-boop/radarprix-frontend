// eslint.config.mjs — Garde-fou statique du frontend.
//
// Jusqu'ici le seul contrôle automatique était que le build passe. Or Vite
// compile sans broncher du code manifestement faux : six noms d'icônes
// inexistants ont traversé un build entier sans un mot, et dix fonctions
// d'API sont restées sans appelant pendant tout un développement.
//
// D'où les deux règles qui comptent vraiment ici — variables et imports
// inutilisés, et dépendances de hooks — plutôt qu'un réglage stylistique.
// Le formatage n'est volontairement pas contraint : le projet est cohérent
// sans, et imposer Prettier maintenant réécrirait dix mille lignes en un
// commit, ce qui rendrait illisible tout l'historique existant.
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "18.3" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Le projet utilise la nouvelle transformation JSX : importer React
      // dans chaque fichier n'est plus nécessaire.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // La règle qui aurait attrapé les icônes inexistantes et les fonctions
      // d'API orphelines. Les arguments non utilisés sont tolérés quand ils
      // sont préfixés d'un underscore : signaler qu'on connaît le paramètre
      // et qu'on l'ignore volontairement est une information utile.
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],

      // Un tableau de dépendances incomplet produit des composants qui
      // affichent des données périmées — un bug qui ne se voit qu'à
      // l'exécution, et seulement parfois.
      "react-hooks/exhaustive-deps": "warn",

      // Une apostrophe française brute dans du JSX est parfaitement valide
      // et le code en est plein : l'interdire n'apporterait que du bruit.
      "react/no-unescaped-entities": "off",

      // Le français typographique impose une espace fine insécable avant
      // « ? », « ! » et « : ». La règle par défaut la voit comme un
      // caractère parasite et pousserait à l'enlever — c'est-à-dire à
      // dégrader la typographie du site pour satisfaire un linter écrit
      // pour l'anglais. On la garde active là où elle est utile (code),
      // désactivée là où le texte est destiné à être lu.
      "no-irregular-whitespace": [
        "error",
        { skipStrings: true, skipTemplates: true, skipComments: true, skipJSXText: true },
      ],

      // Règle très récente qui condamne tout setState dans le corps d'un
      // effet. Le motif qu'elle vise ici — remettre l'état à « chargement »
      // avant de lancer une requête — est la façon standard de charger des
      // données dans React 18, et l'appliquer demanderait de réécrire chaque
      // vue autour d'une bibliothèque de récupération de données. C'est un
      // choix d'architecture, pas une correction de lint : hors sujet tant
      // qu'il n'est pas fait sciemment.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
