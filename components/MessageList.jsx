// MessageList.jsx — Fil de discussion : bulles groupées, séparateurs de
// jour, défilement automatique.
//
// ── Le parti pris « ardoise » ──────────────────────────────────────
// Les messages de l'auteur étaient des bulles orange pleines. Trois
// d'affilée fatiguent déjà l'œil, vingt deviennent illisibles — et
// l'orange, employé comme fond sur la moitié du fil, ne pouvait plus
// signaler quoi que ce soit ailleurs.
//
// Ici, aucune bulle pleine : des cartes sombres bordées d'un trait, orange
// à droite pour soi, cyan à gauche pour l'autre. Ce sont les couleurs que
// le site emploie déjà pour le radar et pour la communauté ; la messagerie
// cesse d'être une île. L'orange redevient ce qu'il doit être : le bouton
// d'envoi, une pastille de non-lu, une alerte.
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
export function grouper(messages, auteurDe, premierNonLu) {
  const groupes = [];
  let jourCourant = null;

  for (const m of messages) {
    const d = dateDe(m.created_at);
    const cle = d ? d.toDateString() : "";
    if (cle !== jourCourant) {
      jourCourant = cle;
      groupes.push({ type: "jour", cle: `jour-${cle}-${m.id}`, libelle: d ? libelleJour(d) : "" });
    }

    // Repère « Nouveaux messages », après la date du jour : l'inverse
    // donnerait « Nouveaux messages » suivi de « Aujourd'hui », comme si le
    // repère annonçait la date. Il coupe le groupe en cours, sinon il se
    // retrouverait au-dessus de messages déjà lus du même auteur.
    if (premierNonLu && m.id === premierNonLu) {
      groupes.push({ type: "nonlus", cle: `nonlus-${m.id}` });
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

/* Actions sur un message : appui long au doigt, clic droit à la souris.
   La croix affichée en permanence à côté de chaque bulle — visible sur
   téléphone faute de survol — mettait quatre croix pour cinq messages. */
function MenuMessage({ message, moi, onSupprimer, onFermer }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      setCopie(true);
      setTimeout(onFermer, 700);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : on le dit
      // plutôt que de laisser croire que c'est copié.
      setCopie("echec");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Actions sur le message"
      onClick={onFermer}
      style={{
        position: "fixed", inset: 0, zIndex: 320, background: "rgba(3,6,12,.6)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rp-modal-in"
        style={{
          width: "100%", maxWidth: 340, background: T.surface,
          border: `1px solid ${T.line}`, borderRadius: 15, padding: 6,
          boxShadow: T.shadowCard, marginBottom: 8,
        }}
      >
        <p
          style={{
            margin: 0, padding: "10px 13px 9px", fontSize: 12.5, color: T.muted,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            borderBottom: `1px solid ${T.line}`,
          }}
        >
          {message.body}
        </p>
        <button onClick={copier} style={actionStyle()}>
          <Icon name="folder" size={15} color={T.sub} />
          {copie === true ? "Copié" : copie === "echec" ? "Copie impossible" : "Copier le texte"}
        </button>
        {moi && onSupprimer && (
          <button onClick={() => { onFermer(); onSupprimer(message); }} style={actionStyle(T.red)}>
            <Icon name="x" size={15} color={T.red} />
            Supprimer ce message
          </button>
        )}
        <button onClick={onFermer} style={actionStyle(T.sub)}>
          <Icon name="chevronDown" size={15} color={T.sub} />
          Annuler
        </button>
      </div>
    </div>
  );
}

function actionStyle(couleur = T.ink) {
  return {
    display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
    background: "none", border: "none", borderRadius: 10, padding: "12px 13px",
    cursor: "pointer", color: couleur, fontSize: 14, fontWeight: 700,
    fontFamily: "'Inter', system-ui, sans-serif",
  };
}

export default function MessageList({
  messages,
  currentUserId,
  hauteur = 420,
  vide,
  // Messagerie privée seulement : accusé de lecture sous son dernier
  // message, repère de non-lus, suppression de ses propres messages. Le
  // salon général n'a rien de tout ça — il est public et sans destinataire.
  accuseLecture = false,
  premierNonLu = null,
  onSupprimer = null,
  pleineHauteur = false,
}) {
  const zone = useRef(null);
  const finRef = useRef(null);
  // Vrai tant que le lecteur est au bas du fil. S'il est remonté pour relire,
  // on ne le ramène pas de force en bas à chaque nouveau message.
  const colleEnBas = useRef(true);
  const [nouveaux, setNouveaux] = useState(0);
  const [menu, setMenu] = useState(null); // { message, moi }
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

  const groupes = grouper(messages, auteurDe, premierNonLu);
  // L'accusé de lecture ne se met que sous le DERNIER de ses propres
  // messages : répété sous chacun, il transformerait le fil en colonne de
  // mentions « Vu ».
  const dernierGroupeAMoi = [...groupes].reverse().find((g) => g.type === "groupe" && g.auteurId === currentUserId);

  return (
    <div style={{ position: "relative", ...(pleineHauteur ? { flex: 1, minHeight: 0, display: "flex" } : {}) }}>
      <div
        ref={zone}
        onScroll={verifierPosition}
        className="rp-fil"
        style={{
          display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto", padding: "16px 16px 10px",
          background: T.bg, border: `1px solid ${T.line}`,
          borderBottom: "none",
          // Dans la messagerie, le fil occupe toute la hauteur restante de
          // l'écran ; ailleurs il garde la hauteur qu'on lui donne.
          ...(pleineHauteur
            ? { flex: 1, minHeight: 0, width: "100%", borderRadius: 0, border: "none", borderTop: `1px solid ${T.line}` }
            : { height: hauteur, borderRadius: `${T.radiusLg}px ${T.radiusLg}px 0 0` }),
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 320 }}>{vide}</div>
        )}

        {groupes.map((g) =>
          g.type === "nonlus" ? (
            <div key={g.cle} style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
              <span style={{ flex: 1, height: 1, background: `${T.red}55` }} />
              <span style={{ fontSize: 10.5, fontWeight: 900, color: T.red, whiteSpace: "nowrap", letterSpacing: ".06em", textTransform: "uppercase" }}>
                Nouveaux messages
              </span>
              <span style={{ flex: 1, height: 1, background: `${T.red}55` }} />
            </div>
          ) : g.type === "jour" ? (
            <div key={g.cle} style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <span style={{ flex: 1, height: 1, background: T.line }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: T.muted, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                {g.libelle}
              </span>
              <span style={{ flex: 1, height: 1, background: T.line }} />
            </div>
          ) : (
            <Groupe
              key={g.cle}
              groupe={g}
              moi={g.auteurId === currentUserId}
              onActions={(m, moi) => setMenu({ message: m, moi })}
              accuse={accuseLecture && g.auteurId === currentUserId && g === dernierGroupeAMoi}
            />
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

      {menu && (
        <MenuMessage
          message={menu.message}
          moi={menu.moi}
          onSupprimer={onSupprimer}
          onFermer={() => setMenu(null)}
        />
      )}
    </div>
  );
}

/** Un bloc de messages consécutifs d'un même auteur. */
function Groupe({ groupe, moi, onActions, accuse }) {
  const fin = groupe.fin ? heure(groupe.fin) : "";
  // Appui long : le geste attendu sur un message, et le seul disponible au
  // doigt puisqu'il n'y a pas de survol. 480 ms — assez pour ne pas se
  // déclencher au défilement, assez court pour ne pas se faire attendre.
  const minuteur = useRef(null);
  const demarrerAppui = (m) => {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => onActions?.(m, moi), 480);
  };
  const annulerAppui = () => clearTimeout(minuteur.current);
  useEffect(() => () => clearTimeout(minuteur.current), []);
  const dernierMessage = groupe.messages[groupe.messages.length - 1];
  const lu = Boolean(dernierMessage?.read_at);
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
        maxWidth: "min(82%, 540px)",
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
          // Le coin côté interlocuteur se ferme sur la dernière bulle : c'est
          // ce qui fait lire le bloc comme une prise de parole unique.
          const rayon = moi
            ? `13px 13px ${dernier ? "4px" : "13px"} 13px`
            : `13px 13px 13px ${dernier ? "4px" : "13px"}`;
          return (
            <div
              key={m.id}
              onContextMenu={(e) => { e.preventDefault(); onActions?.(m, moi); }}
              onTouchStart={() => demarrerAppui(m)}
              onTouchEnd={annulerAppui}
              onTouchMove={annulerAppui}
              onTouchCancel={annulerAppui}
              style={{
                padding: "8px 12px", borderRadius: rayon,
                // Aucune bulle pleine : une carte sombre, un trait de couleur
                // du côté de celui qui parle. Orange pour soi, cyan pour
                // l'autre — les teintes que le site emploie déjà.
                background: moi ? T.surface3 : "transparent",
                color: T.ink,
                border: `1px solid ${T.line}`,
                ...(moi
                  ? { borderRight: `2px solid ${T.emberSolid}` }
                  : { borderLeft: `2px solid ${T.cyan}` }),
                fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontWeight: moi ? 500 : 400,
                WebkitTouchCallout: "none",
              }}
            >
              {m.body}
            </div>
          );
        })}

        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: T.muted, padding: "0 4px" }}>
          {fin}
          {accuse && (
            <>
              <span aria-hidden="true">·</span>
              {lu ? (
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: T.green }}>
                  <Icon name="check" size={11} /> Vu
                </span>
              ) : (
                "Envoyé"
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
