// useActivite.js — Ce qui attend le membre, rafraîchi en tâche de fond.
//
// Messages privés et notifications sont deux mécanismes distincts en base,
// mais une seule question pour qui regarde son téléphone : « est-ce qu'on
// m'a écrit ? ». Le backend les additionne, ce module les tient à jour.
import { useCallback, useEffect, useState } from "react";
import { apiActivite } from "../api.js";

// Assez fréquent pour qu'une pastille ne reste pas fausse longtemps, assez
// espacé pour ne pas transformer chaque onglet ouvert en source de trafic.
const INTERVALLE_MS = 60000;

export default function useActivite(token) {
  const [etat, setEtat] = useState({ messages: 0, notifications: 0, total: 0 });

  const relire = useCallback(() => {
    if (!token) return setEtat({ messages: 0, notifications: 0, total: 0 });
    apiActivite(token)
      .then(setEtat)
      // Une pastille muette vaut mieux qu'une navigation en erreur : on garde
      // la dernière valeur connue.
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    relire();
    if (!token) return undefined;
    const t = setInterval(relire, INTERVALLE_MS);
    // Relire au retour sur l'onglet : quelqu'un qui revient après une heure
    // doit voir l'état réel, pas celui qu'il a laissé.
    const surRetour = () => document.visibilityState === "visible" && relire();
    document.addEventListener("visibilitychange", surRetour);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", surRetour);
    };
  }, [token, relire]);

  return { ...etat, relire };
}
