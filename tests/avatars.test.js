// tests/avatars.test.js — La panoplie d'avatars.
//
// Le jeton « rp:motif-teinte » traverse le réseau et dort en base : c'est un
// format, pas un détail d'affichage. S'il cessait d'être lisible, tous les
// membres qui ont choisi un avatar retomberaient d'un coup sur leur initiale,
// sans que rien ne le signale.
//
// On vérifie donc l'aller-retour, et surtout la tolérance aux jetons devenus
// invalides — un motif retiré du jeu ne doit jamais casser un profil.
import { describe, it, expect } from "vitest";
import { MOTIFS, PALETTES, jetonAvatar, lireJeton, estAvatarMaison, avatarParDefaut } from "../components/avatars.jsx";

describe("le jeu de motifs", () => {
  it("n'a pas de clé en double", () => {
    const cles = MOTIFS.map((m) => m.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("n'a pas de teinte en double", () => {
    const cles = PALETTES.map((p) => p.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("n'emploie que des clés que le backend accepte", () => {
    // Le backend valide la forme sans connaître la liste (voir server.js) :
    // une clé avec un tiret ou un accent y serait refusée.
    for (const m of MOTIFS) expect(m.cle).toMatch(/^[a-z]{2,20}$/);
    for (const p of PALETTES) expect(p.cle).toMatch(/^[a-z]{2,20}$/);
  });

  it("donne un nom lisible à chaque motif", () => {
    for (const m of MOTIFS) expect(m.nom.length).toBeGreaterThan(2);
  });
});

describe("jetonAvatar et lireJeton", () => {
  it("font un aller-retour sur toutes les combinaisons", () => {
    for (const m of MOTIFS) {
      for (const p of PALETTES) {
        const lu = lireJeton(jetonAvatar(m.cle, p.cle));
        expect(lu?.motif.cle).toBe(m.cle);
        expect(lu?.palette.cle).toBe(p.cle);
      }
    }
  });

  it("refuse un motif inconnu plutôt que de deviner", () => {
    expect(lireJeton("rp:licorne-braise")).toBeNull();
  });

  it("refuse une teinte inconnue", () => {
    expect(lireJeton("rp:renard-turquoise")).toBeNull();
  });

  it("ignore ce qui n'est pas un jeton", () => {
    expect(lireJeton("https://exemple.fr/photo.jpg")).toBeNull();
    expect(lireJeton("data:image/jpeg;base64,AAAA")).toBeNull();
    expect(lireJeton("")).toBeNull();
    expect(lireJeton(null)).toBeNull();
  });
});

describe("estAvatarMaison", () => {
  it("distingue un jeton d'une adresse", () => {
    expect(estAvatarMaison("rp:hibou-azur")).toBe(true);
    // Un jeton mal formé reste un jeton : Avatar.jsx doit l'intercepter pour
    // ne pas le passer à <img>, où il déclencherait une requête vers « rp:… ».
    expect(estAvatarMaison("rp:n-importe-quoi")).toBe(true);
    expect(estAvatarMaison("https://exemple.fr/p.png")).toBe(false);
    expect(estAvatarMaison(undefined)).toBe(false);
  });
});

describe("avatarParDefaut", () => {
  it("donne toujours un jeton valide", () => {
    for (const graine of ["Thomas", "a", "", "Zoé-42", "un pseudo très long qui dépasse"]) {
      expect(lireJeton(avatarParDefaut(graine))).not.toBeNull();
    }
  });

  it("reste stable pour un même pseudo", () => {
    expect(avatarParDefaut("Thomas")).toBe(avatarParDefaut("Thomas"));
  });

  it("varie d'un pseudo à l'autre", () => {
    const vus = new Set(["Thomas", "Alice", "Bob", "Carol", "David", "Eve"].map(avatarParDefaut));
    expect(vus.size).toBeGreaterThan(1);
  });
});
