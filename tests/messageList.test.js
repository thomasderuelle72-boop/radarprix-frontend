// Regroupement du fil de discussion : jours, blocs d'auteur, repère de
// non-lus. Une logique invisible tant qu'elle marche, et qui rend le fil
// illisible dès qu'elle se trompe — d'où ces cas.
import { describe, it, expect } from "vitest";
import { grouper } from "../components/MessageList.jsx";

const auteurDe = (m) => m.from_user_id;

/** Message minimal, daté en UTC comme le fait SQLite. */
const msg = (id, auteur, date, body = "…") => ({
  id, from_user_id: auteur, created_at: date, body,
});

describe("regroupement par auteur", () => {
  it("réunit les messages consécutifs d'un même auteur", () => {
    const groupes = grouper(
      [
        msg(1, 7, "2026-08-20 10:00:00"),
        msg(2, 7, "2026-08-20 10:01:00"),
        msg(3, 7, "2026-08-20 10:02:00"),
      ],
      auteurDe
    );
    const blocs = groupes.filter((g) => g.type === "groupe");
    expect(blocs).toHaveLength(1);
    expect(blocs[0].messages).toHaveLength(3);
  });

  it("coupe au-delà de cinq minutes de silence", () => {
    const groupes = grouper(
      [msg(1, 7, "2026-08-20 10:00:00"), msg(2, 7, "2026-08-20 10:30:00")],
      auteurDe
    );
    expect(groupes.filter((g) => g.type === "groupe")).toHaveLength(2);
  });

  it("coupe au changement d'auteur", () => {
    const groupes = grouper(
      [msg(1, 7, "2026-08-20 10:00:00"), msg(2, 9, "2026-08-20 10:00:30")],
      auteurDe
    );
    expect(groupes.filter((g) => g.type === "groupe")).toHaveLength(2);
  });
});

describe("séparateurs de jour", () => {
  it("en pose un par journée, jamais deux", () => {
    const groupes = grouper(
      [
        msg(1, 7, "2026-08-19 22:00:00"),
        msg(2, 9, "2026-08-20 09:00:00"),
        msg(3, 7, "2026-08-20 09:05:00"),
      ],
      auteurDe
    );
    expect(groupes.filter((g) => g.type === "jour")).toHaveLength(2);
  });
});

describe("repère des nouveaux messages", () => {
  it("se place juste avant le premier message non lu", () => {
    const groupes = grouper(
      [
        msg(1, 9, "2026-08-20 10:00:00"),
        msg(2, 9, "2026-08-20 10:01:00"),
        msg(3, 9, "2026-08-20 10:02:00"),
      ],
      auteurDe,
      2
    );
    const position = groupes.findIndex((g) => g.type === "nonlus");
    expect(position).toBeGreaterThan(-1);
    // Le message 1 est avant le repère, les messages 2 et 3 après — même
    // s'ils viennent tous du même auteur et à une minute d'intervalle.
    const avant = groupes.slice(0, position).filter((g) => g.type === "groupe");
    const apres = groupes.slice(position).filter((g) => g.type === "groupe");
    expect(avant.flatMap((g) => g.messages).map((m) => m.id)).toEqual([1]);
    expect(apres.flatMap((g) => g.messages).map((m) => m.id)).toEqual([2, 3]);
  });

  it("vient après la date du jour, pas avant", () => {
    const groupes = grouper([msg(1, 9, "2026-08-20 10:00:00")], auteurDe, 1);
    expect(groupes[0].type).toBe("jour");
    expect(groupes[1].type).toBe("nonlus");
  });

  it("ne pose rien quand tout est lu", () => {
    const groupes = grouper([msg(1, 9, "2026-08-20 10:00:00")], auteurDe, null);
    expect(groupes.some((g) => g.type === "nonlus")).toBe(false);
  });
});
