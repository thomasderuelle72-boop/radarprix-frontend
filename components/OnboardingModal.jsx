// OnboardingModal.jsx — Les deux réglages à faire juste après l'inscription :
// choisir un pseudo, puis une photo.
//
// Pourquoi maintenant et pas dans les paramètres : depuis que les profils
// publics existent, le pseudo n'est plus décoratif, c'est l'adresse du
// profil (/membre/AliceDeal) et le nom sous lequel on apparaît partout. Sans
// cette étape, un nouveau membre s'appelle "Membre #7" et le reste — le
// réglage est dans les paramètres, mais personne ne va l'y chercher.
//
// La photo, elle, reste facultative et se saute en un clic : la réclamer
// fermement à l'inscription ferait perdre des comptes pour un détail.
import { useState } from "react";
import { T } from "../theme.js";
import { apiUpdateProfile } from "../api.js";
import Icon from "./Icon.jsx";
import AvatarPicker from "./AvatarPicker.jsx";

const PSEUDO_MAX = 30;

export default function OnboardingModal({ user, token, onDone, onUpdated }) {
  const [etape, setEtape] = useState(1);
  const [pseudo, setPseudo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const enregistrer = async (patch, etapeSuivante) => {
    setErreur(null);
    setEnCours(true);
    try {
      const maj = await apiUpdateProfile(token, patch);
      onUpdated(maj);
      if (etapeSuivante) setEtape(etapeSuivante);
      else onDone();
    } catch (e) {
      // Le cas le plus fréquent : le pseudo est déjà pris. Le message vient
      // du serveur, seul à pouvoir en juger.
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  };

  const validerPseudo = (e) => {
    e.preventDefault();
    const propre = pseudo.trim();
    if (propre.length < 2) return setErreur("Choisis un pseudo d'au moins 2 caractères.");
    enregistrer({ pseudo: propre.slice(0, PSEUDO_MAX) }, 2);
  };

  const boutonPrincipal = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 22px", borderRadius: 10, border: "none",
    background: enCours ? T.surface2 : T.ember, color: enCours ? T.sub : "#0C0E14",
    fontWeight: 900, fontSize: 13.5, cursor: enCours ? "default" : "pointer",
    fontFamily: "'Inter', sans-serif",
  };
  const boutonSecondaire = {
    padding: "12px 20px", borderRadius: 10, border: `1.5px solid ${T.line}`,
    background: "transparent", color: T.sub, fontWeight: 800, fontSize: 13.5,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 120,
      }}
    >
      <div
        className="rp-modal-in"
        style={{
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18,
          padding: "24px 24px 22px", maxWidth: 460, width: "100%",
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: T.muted, letterSpacing: ".03em" }}>
            ÉTAPE {etape} / 2 — {etape === 1 ? "VOTRE PSEUDO" : "VOTRE PHOTO"}
          </span>
          {/* Fermer revient à passer : le compte est déjà créé, rien n'est perdu. */}
          <button
            type="button"
            onClick={onDone}
            aria-label="Passer cette étape"
            style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.sub, width: 36, height: 36, borderRadius: 8 }}
          >
            ×
          </button>
        </div>

        {/* Progression : deux traits, pas un pourcentage — l'étape 1 sur 2
            se lit d'un coup d'œil. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[1, 2].map((n) => (
            <div
              key={n}
              style={{
                flex: 1, height: 3, borderRadius: 999,
                background: n <= etape ? T.ember : T.surface3,
              }}
            />
          ))}
        </div>

        {etape === 1 && (
          <form onSubmit={validerPseudo}>
            <h3 className="rp-display" style={{ fontSize: 21, fontWeight: 900, color: T.ink, marginBottom: 8 }}>
              Sous quel nom veux-tu apparaître ?
            </h3>
            <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 18 }}>
              C'est le nom que les autres membres verront sous tes deals et tes commentaires,
              et l'adresse de ton profil public. Tu pourras en changer plus tard.
            </p>

            <input
              autoFocus
              value={pseudo}
              onChange={(e) => { setPseudo(e.target.value); setErreur(null); }}
              maxLength={PSEUDO_MAX}
              placeholder="ex : ChasseurDePrix"
              style={{
                width: "100%", padding: "13px 14px", borderRadius: 10,
                border: `1.5px solid ${erreur ? T.red : T.line}`, background: T.surface2,
                color: T.ink, fontSize: 15, fontFamily: "'Inter', sans-serif",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 7, marginBottom: 18 }}>
              <span style={{ fontSize: 11.5, color: erreur ? T.red : T.muted }}>
                {erreur || `radarprix.fr/membre/${pseudo.trim() || "ton-pseudo"}`}
              </span>
              <span style={{ fontSize: 11.5, color: T.muted, whiteSpace: "nowrap" }}>
                {pseudo.length}/{PSEUDO_MAX}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={onDone} style={boutonSecondaire}>Plus tard</button>
              <button type="submit" disabled={enCours} style={boutonPrincipal}>
                {enCours ? "…" : "Continuer"} <Icon name="chevronDown" size={15} style={{ transform: "rotate(-90deg)" }} />
              </button>
            </div>
          </form>
        )}

        {etape === 2 && (
          <>
            <h3 className="rp-display" style={{ fontSize: 21, fontWeight: 900, color: T.ink, marginBottom: 8 }}>
              Ajoute une photo
            </h3>
            <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 18 }}>
              Facultatif, mais un profil avec photo inspire nettement plus confiance quand tu
              partages un bon plan. L'image est recadrée et réduite dans ton navigateur.
            </p>

            <AvatarPicker
              value={avatarUrl}
              onChange={(v) => { setAvatarUrl(v); setErreur(null); }}
              email={user?.email}
              pseudo={pseudo || user?.pseudo}
            />

            {erreur && <p style={{ fontSize: 12, color: T.red, marginTop: 12 }}>{erreur}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" onClick={onDone} style={boutonSecondaire}>Passer</button>
              <button
                type="button"
                disabled={enCours || !avatarUrl}
                onClick={() => enregistrer({ avatarUrl }, null)}
                style={{ ...boutonPrincipal, opacity: avatarUrl ? 1 : 0.5, cursor: avatarUrl ? boutonPrincipal.cursor : "default" }}
              >
                {enCours ? "…" : "Terminer"} <Icon name="check" size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
