// MessageList.jsx — Fil de discussion : bulles groupées, séparateurs de
// jour, défilement automatique.
//
// L'affichage précédent était une simple liste de lignes "pseudo : texte"
// dans une boîte à hauteur fixe. Rien ne distinguait ses propres messages
// de ceux des autres, rien ne datait la conversation, et l'arrivée d'un
// message ne faisait pas défiler la vue : il fallait descendre à la main
// pour le lire.
//
// Ce composant sert aussi bien au salon général qu'aux messages privés :
// c'est le même objet, seule la source des messages change.
import { useEffect, useRef, useState, useCallback } from "react";
import { T } from "../theme.js";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import { ouvrirProfil } from "../routes.js";

/** Parse une date SQLite ("YYYY-MM-DD HH:MM:SS", toujours UTC). */
function dateDe(sql) {
  const d = new Date(String(sql || "").replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Aujourd'hui", "Hier", sinon la date en toutes lettres. */
function libelleJour(d) {
  const jour = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const aujourdhui = jour(new Date());
  const ecart = Math.round((aujourdhui - jour(d)) / 86400000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const heure = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/**
 * Découpe la liste plate en groupes : messages consécutifs d'un même auteur
 * espacés de moins de cinq minutes. Sans ce regroupement, une réponse en
 * trois messages affichait trois fois la photo et le pseudo.
 */
function grouper(messages, auteurDe) {
  const groupes = [];
  let jourCourant = null;

  for (const m of messages) {
    const d = dateDe(m.created_at);
    const cle = d ? d.toDateString() : "";
    if (cle !== jourCourant) {
      jourCourant = cle;
      groupes.push({ type: "jour", cle: `jour-${cle}-${m.id}`, libelle: d ? libelleJour(d) : "" });
    }

    const precedent = groupes[groupes.length - 1];
    const memeAuteur =
      precedent?.type === "groupe" && precedent.auteurId === auteurDe(m) &&
      d && precedent.fin && d - precedent.fin < 5 * 60 * 1000;

    if (memeAuteur) {
      precedent.messages.push(m);
      precedent.fin = d;
    } else {
      groupes.push({
        type: "groupe",
        cle: `g-${m.id}`,
        auteurId: auteurDe(m),
        auteur: m.author,
        avatar: m.avatar_url,
        fin: d,
        messages: [m],
      });
    }
  }
  return groupes;
}

export default function MessageList({ messages, currentUserId, hauteur = 420, vide }) {
  const zone = useRef(null);
  const finRef = useRef(null);
  // Vrai tant que le lecteur est au bas du fil. S'il est remonté pour relire,
  // on ne le ramène pas de force en bas à chaque nouveau message.
  const colleEnBas = useRef(true);
  const [nouveaux, setNouveaux] = useState(0);
  const dernierVu = useRef(0);

  const auteurDe = useCallback((m) => m.user_id ?? m.from_user_id, []);

  const verifierPosition = useCallback(() => {
    const el = zone.current;
    if (!el) return;
    const marge = el.scrollHeight - el.scrollTop - el.clientHeight;
    colleEnBas.current = marge < 80;
    if (colleEnBas.current) setNouveaux(0);
  }, []);

  const descendre = useCallback((doux = true) => {
    finRef.current?.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "end" });
    colleEnBas.current = true;
    setNouveaux(0);
  }, []);

  useEffect(() => {
    const total = messages.length;
    if (total === 0) return;
    const premierRendu = dernierVu.current === 0;
    const arrivees = total - dernierVu.current;
    dernierVu.current = total;

    if (premierRendu) return descendre(false);
    if (colleEnBas.current) descendre(true);
    else if (arrivees > 0) setNouveaux((n) => n + arrivees);
  }, [messages.length, descendre]);

  const groupes = grouper(messages, auteurDe);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={zone}
        onScroll={verifierPosition}
        className="rp-fil"
        style={{
          display: "flex", flexDirection: "column", gap: 14,
          height: hauteur, overflowY: "auto", padding: "16px 16px 10px",
          background: T.bgElevated, border: `1px solid ${T.line}`,
          borderRadius: `${T.radiusLg}px ${T.radiusLg}px 0 0`, borderBottom: "none",
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 320 }}>{vide}</div>
        )}

        {groupes.map((g) =>
          g.type === "jour" ? (
            <div key={g.cle} style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <span style={{ flex: 1, height: 1, background: T.line }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: T.muted, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                {g.libelle}
              </span>
              <span style={{ flex: 1, height: 1, background: T.line }} />
            </div>
          ) : (
            <Groupe key={g.cle} groupe={g} moi={g.auteurId === currentUserId} />
          )
        )}
        <div ref={finRef} />
      </div>

      {/* Pastille d'arrivée : elle n'apparaît que si le lecteur a remonté le
          fil — le ramener de force en bas lui ferait perdre sa lecture. */}
      {nouveaux > 0 && (
        <button
          onClick={() => descendre(true)}
          className="fade-up"
          style={{
            position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 15px", borderRadius: 999, border: "none",
            background: T.ember, color: "#0C0E14", fontWeight: 900, fontSize: 12.5,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            boxShadow: "0 10px 26px rgba(0,0,0,.45)", zIndex: 2,
          }}
        >
          <Icon name="chevronDown" size={14} />
          {nouveaux} nouveau{nouveaux > 1 ? "x" : ""} message{nouveaux > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

/** Un bloc de messages consécutifs d'un même auteur. */
function Groupe({ groupe, moi }) {
  const fin = groupe.fin ? heure(groupe.fin) : "";
  return (
    <div
      className="msg-slide-in"
      style={{
        display: "flex", gap: 9, alignItems: "flex-end",
        // Ses propres messages à droite : c'est la convention de toutes les
        // messageries, et le seul repère qui évite de lire les pseudos.
        flexDirection: moi ? "row-reverse" : "row",
      }}
    >
      {!moi && (
        <button
          onClick={() => ouvrirProfil(groupe.auteurId)}
          title={`Voir le profil de ${groupe.auteur}`}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
        >
          <Avatar email={groupe.auteur} avatarUrl={groupe.avatar} size={30} />
        </button>
      )}

      <div style={{
        minWidth: 0,
        // Plafond en pixels en plus du pourcentage : sur un écran large, une
        // bulle à 76 % d'un fil de 900 px traverse tout l'écran et se lit
        // moins bien qu'une colonne de texte de largeur raisonnable.
        maxWidth: "min(76%, 520px)",
        display: "flex", flexDirection: "column", alignItems: moi ? "flex-end" : "flex-start", gap: 3 }}>
        {!moi && (
          <button
            onClick={() => ouvrirProfil(groupe.auteurId)}
            className="rp-author-name"
            style={{ background: "none", border: "none", padding: "0 4px", cursor: "pointer", fontSize: 11.5, fontWeight: 800, color: T.sub, fontFamily: "'Inter', sans-serif" }}
          >
            {groupe.auteur}
          </button>
        )}

        {groupe.messages.map((m, i) => {
          const dernier = i === groupe.messages.length - 1;
          // Le coin côté avatar reste carré sur la dernière bulle : c'est ce
          // qui fait lire le bloc comme une prise de parole unique.
          const rayon = moi
            ? `16px 16px ${dernier ? "5px" : "16px"} 16px`
            : `16px 16px 16px ${dernier ? "5px" : "16px"}`;
          return (
            <div
              key={m.id}
              style={{
                padding: "9px 13px", borderRadius: rayon,
                background: moi ? T.ember : T.surface2,
                color: moi ? "#0C0E14" : T.ink,
                border: moi ? "none" : `1px solid ${T.line}`,
                fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontWeight: moi ? 600 : 400,
              }}
            >
              {m.body}
            </div>
          );
        })}

        <span style={{ fontSize: 10.5, color: T.muted, padding: "0 4px" }}>{fin}</span>
      </div>
    </div>
  );
}
