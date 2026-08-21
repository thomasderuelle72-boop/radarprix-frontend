// Formatage de l'ancienneté du dernier balayage.
import { describe, it, expect } from "vitest";
import { depuis } from "../components/useRadar.js";

/** Date SQLite (UTC) située il y a `minutes`. */
const ilYa = (minutes) =>
  new Date(Date.now() - minutes * 60000).toISOString().slice(0, 19).replace("T", " ");

describe("ancienneté du balayage", () => {
  it("dit « à l'instant » sous la minute", () => {
    expect(depuis(ilYa(0))).toBe("à l'instant");
  });

  it("compte en minutes, puis en heures, puis en jours", () => {
    expect(depuis(ilYa(4))).toBe("il y a 4 min");
    expect(depuis(ilYa(59))).toBe("il y a 59 min");
    expect(depuis(ilYa(60))).toBe("il y a 1 h");
    expect(depuis(ilYa(60 * 26))).toBe("il y a 1 j");
  });

  it("ne prétend rien sans date", () => {
    // Un site qui affiche « il y a NaN min » perd la confiance qu'il
    // cherchait justement à gagner en affichant cette ligne.
    expect(depuis(null)).toBeNull();
    expect(depuis("")).toBeNull();
    expect(depuis("pas une date")).toBeNull();
  });

  it("ne renvoie rien pour une date future", () => {
    // Décalage d'horloge entre le serveur et le navigateur : mieux vaut se
    // taire qu'annoncer « il y a -3 min ».
    expect(depuis(ilYa(-10))).toBeNull();
  });
});
