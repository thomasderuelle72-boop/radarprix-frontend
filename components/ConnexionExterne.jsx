// ConnexionExterne.jsx — Les boutons « Continuer avec Google » et « avec Apple ».
//
// CE QUI SE PASSE VRAIMENT
//
// Le fournisseur ouvre sa propre fenêtre, la personne s'y identifie chez lui,
// et il nous rend un « jeton d'identité » — un texte signé qui affirme qui
// elle est. On l'envoie au serveur, qui le vérifie et ouvre une session
// RadarPrix. Le mot de passe Google ne transite jamais par nous, et on ne
// demande accès à aucune donnée : ni contacts, ni agenda, ni fichiers.
//
// POURQUOI LES BOUTONS SONT CEUX DES FOURNISSEURS
//
// Google et Apple imposent l'apparence de leur bouton dans leurs conditions.
// On les laisse donc dessiner le leur, ce qui évite en prime de réinventer
// des états de survol et d'accessibilité qu'ils ont déjà traités.
//
// Rien ne s'affiche tant que le serveur ne déclare pas le fournisseur : un
// bouton qui mène à une erreur vaut moins que pas de bouton.
import React, { useEffect, useRef, useState } from "react";
import { T } from "../theme.js";
import { apiFournisseurs, apiConnexionExterne } from "../api.js";

/* Charge un script une seule fois, même si le composant est monté deux fois.
   Sans cette mémoire, ouvrir puis fermer puis rouvrir la fenêtre de connexion
   empilerait les scripts et les initialisations. */
const charges = new Map();
function chargerScript(src) {
  if (charges.has(src)) return charges.get(src);
  const promesse = new Promise((resoudre, rejeter) => {
    const existant = document.querySelector(`script[src="${src}"]`);
    if (existant) return existant.dataset.pret ? resoudre() : existant.addEventListener("load", resoudre);
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => { el.dataset.pret = "1"; resoudre(); };
    el.onerror = () => rejeter(new Error(`script indisponible : ${src}`));
    document.head.appendChild(el);
  });
  charges.set(src, promesse);
  return promesse;
}

export default function ConnexionExterne({ onSuccess, onErreur }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [enCours, setEnCours] = useState(null);
  const zoneGoogle = useRef(null);

  useEffect(() => {
    let vivant = true;
    apiFournisseurs().then((f) => vivant && setFournisseurs(f));
    return () => { vivant = false; };
  }, []);

  const google = fournisseurs.find((f) => f.id === "google");
  const apple = fournisseurs.find((f) => f.id === "apple");

  /* La réponse du fournisseur, quel qu'il soit : on échange son jeton contre
     une session à nous, et on laisse le parent décider de la suite. */
  const entrer = async (id, jeton) => {
    setEnCours(id);
    try {
      const data = await apiConnexionExterne(id, jeton);
      onSuccess(data.token, data.user);
    } catch (e) {
      onErreur(e.message);
    } finally {
      setEnCours(null);
    }
  };

  useEffect(() => {
    if (!google || !zoneGoogle.current) return;
    let annule = false;
    chargerScript("https://accounts.google.com/gsi/client")
      .then(() => {
        if (annule || !window.google?.accounts?.id || !zoneGoogle.current) return;
        window.google.accounts.id.initialize({
          client_id: google.clientId,
          callback: (reponse) => reponse?.credential && entrer("google", reponse.credential),
        });
        window.google.accounts.id.renderButton(zoneGoogle.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "fr",
          width: 320,
        });
      })
      .catch(() => onErreur("Connexion Google indisponible pour le moment."));
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [google]);

  const entrerApple = async () => {
    if (!apple) return;
    try {
      await chargerScript(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/fr_FR/appleid.auth.js"
      );
      window.AppleID.auth.init({
        clientId: apple.clientId,
        scope: "name email",
        // Apple exige une adresse de retour déclarée même en fenêtre
        // surgissante, et elle doit correspondre au domaine enregistré.
        redirectURI: `${window.location.origin}/`,
        usePopup: true,
      });
      const reponse = await window.AppleID.auth.signIn();
      const jeton = reponse?.authorization?.id_token;
      if (!jeton) throw new Error("Apple n'a pas rendu de jeton.");
      await entrer("apple", jeton);
    } catch (e) {
      // Fermer la fenêtre Apple soi-même n'est pas une panne : ne pas
      // afficher d'erreur rouge pour un simple changement d'avis.
      if (e?.error === "popup_closed_by_user") return;
      onErreur(e.message || "Connexion Apple indisponible pour le moment.");
    }
  };

  if (!google && !apple) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
        <span style={{ flex: 1, height: 1, background: T.line }} />
        <span style={{ fontSize: 11, color: T.sub, letterSpacing: 0.4 }}>OU</span>
        <span style={{ flex: 1, height: 1, background: T.line }} />
      </div>

      {google && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: apple ? 10 : 0, minHeight: 44 }}>
          <div ref={zoneGoogle} aria-busy={enCours === "google"} />
        </div>
      )}

      {apple && (
        <button
          type="button"
          onClick={entrerApple}
          disabled={enCours !== null}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 999,
            border: `1px solid ${T.line}`,
            background: "#000",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: enCours ? "default" : "pointer",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            // 44 px : la cible tactile minimale, sinon le bouton se rate au pouce.
            minHeight: 44,
          }}
        >
          <svg width="15" height="18" viewBox="0 0 14 17" fill="#fff" aria-hidden="true">
            <path d="M11.6 9c0-1.7 1.4-2.5 1.5-2.6-.8-1.2-2-1.3-2.5-1.4-1-.1-2 .6-2.6.6-.5 0-1.4-.6-2.3-.6C4.4 5.1 3.2 5.8 2.6 7c-1.3 2.3-.3 5.6.9 7.5.6.9 1.3 1.9 2.3 1.9.9 0 1.2-.6 2.3-.6s1.4.6 2.3.6c1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2.1-.1 0-1.9-.7-1.9-2.8zM10 3.9c.5-.6.8-1.4.7-2.3-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.6-.4 2.2-1z" />
          </svg>
          {enCours === "apple" ? "Connexion…" : "Continuer avec Apple"}
        </button>
      )}
    </div>
  );
}
