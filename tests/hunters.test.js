// tests/hunters.test.js — Le format de jeton des avatars « Radar Hunters ».
//
// Le jeton « rh:…14 caractères » traverse le réseau et dort en base : c'est
// un format, pas un détail d'affichage. S'il cessait d'être lisible, tous
// les membres qui ont composé un chasseur retomberaient d'un coup sur leur
// initiale, sans que rien ne le signale.
//
// Deux propriétés comptent plus que les autres : l'aller-retour doit être
// exact, et un jeton devenu invalide — pièce retirée du jeu, caractère
// abîmé — doit être refusé proprement plutôt que rendre n'importe quoi.
import { describe, it, expect } from "vitest";
import {
  jetonHunter, lireHunter, tirerHunter, estHunter, accorder,
  VISAGES, COIFFURES, YEUX, CHEFS, ACCESSOIRES, TEINTES, PEAUX,
} from "../components/hunters.jsx";

describe("jetonHunter et lireHunter", () => {
  it("font un aller-retour exact sur un tirage", () => {
    for (let i = 0; i < 200; i++) {
      const c = tirerHunter(i);
      const relu = lireHunter(jetonHunter(c));
      expect(relu).not.toBeNull();
      for (const cle of Object.keys(c)) expect(relu[cle]).toBe(c[cle]);
    }
  });

  it("produit toujours un jeton de 17 caractères", () => {
    for (let i = 0; i < 50; i++) expect(jetonHunter(tirerHunter(i))).toHaveLength(17);
  });

  it("refuse un jeton trop court ou trop long", () => {
    expect(lireHunter("rh:0000000000000")).toBeNull();   // 13
    expect(lireHunter("rh:000000000000000")).toBeNull(); // 15
  });

  it("refuse un index qui sort du jeu", () => {
    // « z » = 35 : au-delà de toutes les listes de pièces.
    expect(lireHunter("rh:z0000000000000")).toBeNull();
    expect(lireHunter("rh:0000000000000z")).toBeNull();
  });

  it("refuse un caractère hors base36", () => {
    expect(lireHunter("rh:0000000000000-")).toBeNull();
    expect(lireHunter("rh:0000000000000É")).toBeNull();
  });

  it("ignore ce qui n'est pas un chasseur", () => {
    expect(lireHunter("rp:renard-braise")).toBeNull();
    expect(lireHunter("https://exemple.fr/p.png")).toBeNull();
    expect(lireHunter("")).toBeNull();
    expect(lireHunter(null)).toBeNull();
  });
});

describe("estHunter", () => {
  it("distingue un chasseur des autres formes d'avatar", () => {
    expect(estHunter("rh:00000000000000")).toBe(true);
    // Mal formé mais préfixé : Avatar.jsx doit tout de même l'intercepter,
    // sans quoi il partirait à <img> et déclencherait une requête « rh:… ».
    expect(estHunter("rh:nimportequoi")).toBe(true);
    expect(estHunter("rp:hibou-azur")).toBe(false);
    expect(estHunter(undefined)).toBe(false);
  });
});

describe("les règles d'accord", () => {
  it("rase le crâne sous un casque intégral", () => {
    expect(accorder({ chef: 3, coiffure: 5 }).coiffure).toBe(4);
  });

  it("neutralise l'expression sous un masque", () => {
    expect(accorder({ accessoire: 2, expression: 3 }).expression).toBe(0);
  });

  it("retire le couvre-chef sous une visière", () => {
    expect(accorder({ yeux: 3, chef: 2 }).chef).toBe(0);
  });

  it("laisse tranquille une combinaison sans conflit", () => {
    const c = { chef: 1, coiffure: 2, yeux: 0, expression: 1, accessoire: 0 };
    expect(accorder(c)).toEqual(c);
  });

  it("survit à l'aller-retour par le jeton", () => {
    // Un accord appliqué avant l'encodage doit encore tenir après lecture.
    for (let i = 0; i < 100; i++) {
      const relu = lireHunter(jetonHunter(tirerHunter("a" + i)));
      if (relu.chef === 3) expect(relu.coiffure).toBe(4);
      if (relu.accessoire === 2) expect(relu.expression).toBe(0);
      if (relu.yeux === 3) expect(relu.chef).toBe(0);
    }
  });
});

describe("tirerHunter", () => {
  it("ne tire jamais une rareté : elle se gagne", () => {
    for (let i = 0; i < 100; i++) expect(tirerHunter(i).rarete).toBe(0);
  });

  it("reste stable pour une même graine", () => {
    expect(jetonHunter(tirerHunter("Thomas"))).toBe(jetonHunter(tirerHunter("Thomas")));
  });

  it("varie d'une graine à l'autre", () => {
    const vus = new Set(Array.from({ length: 30 }, (_, i) => jetonHunter(tirerHunter(i))));
    expect(vus.size).toBeGreaterThan(20);
  });

  it("reste dans les bornes de chaque couche", () => {
    for (let i = 0; i < 100; i++) {
      const c = tirerHunter(i);
      expect(c.visage).toBeLessThan(VISAGES.length);
      expect(c.coiffure).toBeLessThan(COIFFURES.length);
      expect(c.yeux).toBeLessThan(YEUX.length);
      expect(c.chef).toBeLessThan(CHEFS.length);
      expect(c.accessoire).toBeLessThan(ACCESSOIRES.length);
      expect(c.peau).toBeLessThan(PEAUX.length);
      expect(c.teinte).toBeLessThan(Object.keys(TEINTES).length);
    }
  });
});

describe("le format accepté par le backend", () => {
  it("correspond à la validation de server.js", () => {
    // Ce motif est recopié de src/server.js. S'il diverge, toute
    // sauvegarde d'avatar échouerait en production sans que rien ici
    // ne le signale.
    const BACKEND = /^rh:[0-9a-z]{14}$/;
    for (let i = 0; i < 100; i++) expect(BACKEND.test(jetonHunter(tirerHunter(i)))).toBe(true);
  });
});
