// useRadar.js — L'état du radar, partagé par la navigation et le menu.
//
// Une seule requête pour plusieurs composants : la barre du bas affiche le
// nombre de détections, le menu affiche l'heure du dernier balayage. Les
// laisser interroger chacun de leur côté doublerait les appels pour une
// information identique.
import { useEffect, useState } from "react";
import { fetchRadar } from "../api.js";

// Rafraîchissement aligné sur la cadence réelle de la surveillance : demander
// plus souvent que le radar ne balaie ne rapporterait rien de neuf.
const INTERVALLE_MS = 90000;

export default function useRadar() {
  const [etat, setEtat] = useState(null);

  useEffect(() => {
    let vivant = true;
    const lire = () =>
      fetchRadar()
        .then((r) => vivant && setEtat(r))
        // Un indicateur muet vaut mieux qu'une navigation en erreur : on
        // garde la dernière valeur connue plutôt que d'afficher un échec.
        .catch(() => {});
    lire();
    const t = setInterval(lire, INTERVALLE_MS);
    return () => {
      vivant = false;
      clearInterval(t);
    };
  }, []);

  return etat;
}

/** « il y a 4 min », à partir d'une date SQLite (UTC). */
export function depuis(dateSql) {
  if (!dateSql) return null;
  const ms = Date.now() - new Date(`${String(dateSql).replace(" ", "T")}Z`).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}
