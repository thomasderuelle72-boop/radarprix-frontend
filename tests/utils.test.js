// tests/utils.test.js — Les fonctions pures du frontend.
//
// Le frontend n'avait aucun test : le seul garde-fou était que le build
// passe, ce qui ne dit rien de la justesse d'un calcul. Ces fonctions-là
// sont les plus rentables à couvrir — elles n'ont ni état ni rendu, elles
// s'exécutent en une milliseconde, et une erreur dedans se voit partout
// (chaque carte de deal affiche une date relative).
//
// Le temps est figé pour que les tests ne dépendent pas de l'heure à
// laquelle on les lance — c'est exactement le genre de test qui, sinon,
// échoue un jour sur trente sans que personne ne comprenne pourquoi.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { relativeTime, anciennete, dateLongue, estExpire, nombreLisible, comparaison } from "../utils.js";

const MAINTENANT = new Date("2026-08-20T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MAINTENANT);
});
afterEach(() => {
  vi.useRealTimers();
});

/** Un horodatage SQLite (UTC) décalé de N minutes dans le passé. */
function ilYa(minutes) {
  return new Date(MAINTENANT.getTime() - minutes * 60000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

describe("relativeTime", () => {
  it("dit « à l'instant » sous la minute", () => {
    expect(relativeTime(ilYa(0))).toBe("à l'instant");
  });

  it("compte en minutes sous l'heure", () => {
    expect(relativeTime(ilYa(8))).toBe("il y a 8 min");
  });

  it("bascule en heures au-delà de soixante minutes", () => {
    expect(relativeTime(ilYa(120))).toBe("il y a 2 h");
  });

  it("bascule en jours au-delà de vingt-quatre heures", () => {
    expect(relativeTime(ilYa(60 * 24 * 3))).toBe("il y a 3 j");
  });

  it("ne renvoie jamais de durée négative sur un horodatage futur", () => {
    const futur = new Date(MAINTENANT.getTime() + 3600000).toISOString().slice(0, 19).replace("T", " ");
    expect(relativeTime(futur)).toBe("à l'instant");
  });

  it("renvoie null plutôt qu'une date inventée sur une entrée illisible", () => {
    expect(relativeTime(null)).toBeNull();
    expect(relativeTime("pas une date")).toBeNull();
  });
});

describe("anciennete", () => {
  it("distingue le jour même", () => {
    expect(anciennete(ilYa(60))).toBe("inscrit aujourd'hui");
  });

  it("accorde le pluriel des jours", () => {
    expect(anciennete(ilYa(60 * 24))).toBe("depuis 1 jour");
    expect(anciennete(ilYa(60 * 24 * 5))).toBe("depuis 5 jours");
  });

  it("passe aux mois au-delà de trente jours", () => {
    expect(anciennete(ilYa(60 * 24 * 90))).toBe("depuis 2 mois");
  });

  it("passe aux années au-delà de douze mois, avec accord", () => {
    expect(anciennete(ilYa(60 * 24 * 400))).toBe("depuis 1 an");
    expect(anciennete(ilYa(60 * 24 * 800))).toBe("depuis 2 ans");
  });

  it("évite le « il y a 1825 j » que produirait relativeTime", () => {
    // C'est la raison d'être de cette fonction : relativeTime s'arrête aux
    // jours et devient illisible sur un compte ancien.
    expect(relativeTime(ilYa(60 * 24 * 1825))).toBe("il y a 1825 j");
    expect(anciennete(ilYa(60 * 24 * 1825))).toBe("depuis 4 ans");
  });
});

describe("dateLongue", () => {
  it("écrit la date en toutes lettres, en français", () => {
    expect(dateLongue("2025-04-29 08:30:00")).toBe("29 avril 2025");
  });

  it("renvoie null sur une entrée absente", () => {
    expect(dateLongue(null)).toBeNull();
  });
});

describe("estExpire", () => {
  it("reconnaît une date passée", () => {
    expect(estExpire(ilYa(1))).toBe(true);
  });

  it("laisse passer une date future", () => {
    const futur = new Date(MAINTENANT.getTime() + 86400000).toISOString().slice(0, 19).replace("T", " ");
    expect(estExpire(futur)).toBe(false);
  });

  it("ne considère pas comme expirée une offre sans date de fin", () => {
    // Une offre sans échéance est permanente, pas périmée : l'inverse
    // masquerait tous les bons plans qui n'annoncent pas de date.
    expect(estExpire(null)).toBe(false);
    expect(estExpire("")).toBe(false);
  });
});

describe("nombreLisible", () => {
  it("sépare les milliers à la française", () => {
    // L'espace produite par toLocaleString est insécable : on compare donc
    // sur les chiffres plutôt que sur un littéral qui dépend du moteur.
    expect(nombreLisible(54470).replace(/\s/g, " ")).toBe("54 470");
  });

  it("laisse les petits nombres intacts", () => {
    expect(nombreLisible(7)).toBe("7");
  });

  it("affiche un tiret plutôt que « null » quand la donnée manque", () => {
    expect(nombreLisible(null)).toBe("—");
    expect(nombreLisible(undefined)).toBe("—");
  });

  it("distingue zéro d'une donnée absente", () => {
    // Le piège classique : `if (!n)` afficherait « — » pour un vrai zéro.
    expect(nombreLisible(0)).toBe("0");
  });
});

/* La même serrure Nuki occupait deux cartes de l'accueil, au même prix,
   sans qu'aucune ne dise qu'il s'agissait du même article. */
describe("comparaison", () => {
  it("ne dit rien quand il n'y a rien à comparer", () => {
    expect(comparaison({ price: 100, autresMarchands: [] })).toBeNull();
    expect(comparaison({ price: 100 })).toBeNull();
  });

  it("nomme l'autre marchand quand ils sont deux", () => {
    const c = comparaison({
      price: 299.99,
      nbMarchands: 2,
      autresMarchands: [{ marchand: "Boulanger", prix: 299.99 }],
    });
    expect(c.alerte).toBe(false);
    expect(c.total).toBe(2);
    expect(c.libelle).toBe("Aussi chez Boulanger — 299,99 €");
    // À prix égal, personne n'est « le moins cher ».
    expect(c.avantage).toBe(false);
  });

  it("ne se dit le moins cher que si l'écart existe", () => {
    const c = comparaison({
      price: 269.9,
      nbMarchands: 2,
      autresMarchands: [{ marchand: "Fnac", prix: 310 }],
    });
    expect(c.avantage).toBe(true);
  });

  it("annonce le moins cher même quand ce n'est pas celui de la carte", () => {
    const c = comparaison({
      price: 299.99,
      nbMarchands: 3,
      autresMarchands: [
        { marchand: "Fnac", prix: 310 },
        { marchand: "Boulanger", prix: 269.9 },
      ],
    });
    expect(c.alerte).toBe(true);
    expect(c.libelle).toBe("Moins cher chez Boulanger : 269,90 €");
  });

  it("compte tous les marchands, pas seulement ceux qui sont listés", () => {
    // Le serveur plafonne la liste à quatre : le décompte doit rester juste.
    const c = comparaison({
      price: 100,
      nbMarchands: 7,
      autresMarchands: [
        { marchand: "A", prix: 100 },
        { marchand: "B", prix: 110 },
        { marchand: "C", prix: 120 },
        { marchand: "D", prix: 130 },
      ],
    });
    expect(c.libelle).toBe("Aussi chez 6 autres marchands");
    expect(c.total).toBe(7);
  });

  it("ignore un prix absent au lieu de le prendre pour une aubaine", () => {
    const c = comparaison({
      price: 100,
      nbMarchands: 2,
      autresMarchands: [{ marchand: "Cdiscount", prix: 0 }],
    });
    expect(c.alerte).toBe(false);
  });
});
