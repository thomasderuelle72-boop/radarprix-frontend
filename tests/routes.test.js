// tests/routes.test.js — La traduction entre URL et état de navigation.
//
// C'est le seul endroit du frontend où une erreur casse le partage de liens,
// les favoris du navigateur et l'indexation d'un coup. Et comme les deux
// fonctions sont réciproques, elles se vérifient l'une l'autre : un aller-
// retour qui ne retombe pas sur ses pieds signale une incohérence qu'aucune
// des deux ne révélerait seule.
import { describe, it, expect } from "vitest";
import { stateToPath, pathToState } from "../routes.js";

describe("stateToPath", () => {
  it("donne la racine à l'accueil", () => {
    expect(stateToPath({ view: "home" })).toBe("/");
  });

  it("sépare les deux onglets de résultats", () => {
    expect(stateToPath({ view: "results", tab: "deals" })).toBe("/deals");
    expect(stateToPath({ view: "results", tab: "erreurs" })).toBe("/erreurs");
  });

  it("porte le terme cherché dans la requête", () => {
    expect(stateToPath({ view: "results", searchTerm: "PS5 slim" })).toBe("/recherche?q=PS5%20slim");
  });

  it("encode un nom de produit contenant des caractères réservés", () => {
    const chemin = stateToPath({ view: "dealDetail", produit: "Casque «Pro» & Co" });
    expect(chemin.startsWith("/produit/")).toBe(true);
    expect(chemin).not.toContain(" ");
    expect(chemin).not.toContain("&");
  });

  it("retombe sur l'accueil quand la donnée nécessaire manque", () => {
    // Une fiche produit sans produit n'a pas d'URL : mieux vaut l'accueil
    // qu'une adresse cassée mise en favori par le visiteur.
    expect(stateToPath({ view: "dealDetail" })).toBe("/");
    expect(stateToPath({ view: "marchand" })).toBe("/");
    expect(stateToPath({ view: "membre" })).toBe("/");
  });

  it("couvre les vues de flux et la communauté", () => {
    expect(stateToPath({ view: "flux" })).toBe("/bons-plans");
    expect(stateToPath({ view: "occasion" })).toBe("/occasion");
    expect(stateToPath({ view: "favoris" })).toBe("/favoris");
    expect(stateToPath({ view: "communaute-picks" })).toBe("/communaute");
    expect(stateToPath({ view: "communaute-chat" })).toBe("/communaute/chat");
    expect(stateToPath({ view: "communaute-forum" })).toBe("/communaute/forum");
  });
});

describe("pathToState", () => {
  it("ramène la racine à l'accueil", () => {
    expect(pathToState("/", "")).toEqual({ view: "home" });
  });

  it("relit un terme de recherche", () => {
    expect(pathToState("/recherche", "?q=aspirateur")).toEqual({
      view: "results",
      searchTerm: "aspirateur",
    });
  });

  it("ramène à l'accueil une recherche sans terme", () => {
    expect(pathToState("/recherche", "")).toEqual({ view: "home" });
  });

  it("décode un nom de produit encodé", () => {
    expect(pathToState("/produit/Casque%20Gaming", "")).toEqual({
      view: "dealDetail",
      produit: "Casque Gaming",
    });
  });

  it("ramène à l'accueil une adresse inconnue plutôt que de rester dans le vide", () => {
    expect(pathToState("/cette-page-nexiste-pas", "")).toEqual({ view: "home" });
  });
});

describe("aller-retour entre les deux", () => {
  // Chaque état doit survivre au passage en URL puis au retour. C'est ce qui
  // garantit qu'un lien partagé rouvre exactement la vue qu'on voulait.
  const etats = [
    { view: "home" },
    { view: "results", tab: "deals" },
    { view: "results", tab: "erreurs" },
    { view: "results", searchTerm: "PS5 slim" },
    { view: "dealDetail", produit: "Casque «Pro» & Co" },
    { view: "marchand", marchand: "Cdiscount" },
    { view: "membre", membre: "thomas" },
    { view: "flux" },
    { view: "occasion" },
    { view: "favoris" },
    { view: "communaute-picks" },
    { view: "communaute-chat" },
    { view: "communaute-forum" },
    // Pages secondaires : c'est ici qu'un oubli se voit tout de suite,
    // puisque chacune doit exister dans les deux sens de la table.
    { view: "info", infoPage: "a-propos" },
    { view: "info", infoPage: "faq" },
    { view: "info", infoPage: "contact" },
    { view: "info", infoPage: "mentions" },
    { view: "info", infoPage: "cgu" },
    { view: "info", infoPage: "confidentialite" },
  ];

  for (const etat of etats) {
    it(`conserve ${etat.view}${etat.tab ? ` (${etat.tab})` : ""}${etat.infoPage ? ` (${etat.infoPage})` : ""}`, () => {
      const chemin = stateToPath(etat);
      const [avantQuestion, apresQuestion] = chemin.split("?");
      const retour = pathToState(avantQuestion, apresQuestion ? `?${apresQuestion}` : "");

      expect(retour.view).toBe(etat.view);
      for (const cle of ["tab", "searchTerm", "produit", "marchand", "membre", "infoPage"]) {
        if (etat[cle] !== undefined) expect(retour[cle]).toBe(etat[cle]);
      }
    });
  }
});
