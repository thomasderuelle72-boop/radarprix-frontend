// MessagerieView.jsx — La messagerie privée, comme page à part entière.
//
// Les messages privés étaient un onglet à l'intérieur de la page « Salon &
// messages », elle-même rangée sous Communauté. Trois conséquences :
//
//  · on y arrivait par un menu déroulant, deux niveaux sous l'accueil, alors
//    qu'un message qui attend est ce qu'on vient voir en premier ;
//  · le fil vivait dans une boîte de 368 pixels au milieu d'une page qui
//    défilait — l'inverse d'une messagerie, où c'est le fil qui défile et le
//    reste qui tient en place ;
//  · le salon général, public, et les messages privés partageaient un même
//    écran alors qu'ils n'ont ni le même public ni le même usage.
//
// Ici : deux volets qui occupent la hauteur de l'écran, la liste à gauche, le
// fil à droite, et rien d'autre. Le salon reste dans Communauté, à sa place.
import { useState, useEffect, useCallback, useMemo } from "react";
import { T } from "../theme.js";
import {
  apiGetMembers, apiGetConversations, apiGetConversationWith, apiPostMessageTo,
  apiSupprimerConversation, apiConversationNonLue, apiSupprimerMessage,
  apiMemberProfile,
} from "../api.js";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import MessageList from "./MessageList.jsx";
import MessageComposer from "./MessageComposer.jsx";
import { relativeTime } from "../utils.js";
import { ouvrirProfil } from "../routes.js";

const SONDAGE_FIL = 5000;
const SONDAGE_LISTE = 9000;

export default function MessagerieView({ token, currentUserId, onBack, correspondant }) {
  const [conversations, setConversations] = useState(null);
  const [membres, setMembres] = useState(null);
  const [actif, setActif] = useState(null); // { user_id, display_name, avatar_url }
  const [fil, setFil] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [nouvelle, setNouvelle] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [confirmation, setConfirmation] = useState(null); // { type, message? }
  const [erreur, setErreur] = useState(null);
  // Repère « Nouveaux messages », figé à l'ouverture du fil : ouvrir une
  // conversation la marque lue côté serveur, donc l'information disparaît
  // dès la première lecture si on ne la retient pas ici.
  const [premierNonLu, setPremierNonLu] = useState(null);
  // Qui est en face. Sur un site où l'on parle d'argent avec des inconnus,
  // « membre depuis mars, 12 deals publiés » vaut mieux que « voir le
  // profil » : la première ligne renseigne, la seconde renvoie ailleurs.
  const [fiche, setFiche] = useState(null);

  const chargerConversations = useCallback(async () => {
    try {
      const d = await apiGetConversations(token);
      setConversations(d.items);
    } catch (e) {
      setErreur(e.message);
      setConversations([]);
    }
  }, [token]);

  useEffect(() => {
    chargerConversations();
    apiGetMembers(token).then(setMembres).catch(() => setMembres([]));
    const t = setInterval(chargerConversations, SONDAGE_LISTE);
    return () => clearInterval(t);
  }, [token, chargerConversations]);

  // Fil ouvert : relu régulièrement pour que la réponse d'en face arrive
  // sans avoir à quitter puis rouvrir la conversation.
  useEffect(() => {
    if (!actif) return undefined;
    let arrete = false;
    const relire = async () => {
      try {
        const items = await apiGetConversationWith(token, actif.user_id);
        if (!arrete) setFil(items);
      } catch { /* le réseau peut hoqueter : le sondage suivant rattrapera */ }
    };
    relire();
    const t = setInterval(relire, SONDAGE_FIL);
    return () => { arrete = true; clearInterval(t); };
  }, [actif, token]);

  const ouvrir = useCallback((personne) => {
    setActif(personne);
    setFil([]);
    setNouvelle(false);
    setMenuOuvert(false);
    setErreur(null);
    setPremierNonLu(personne.non_lus > 0 ? { attendus: personne.non_lus, id: null } : null);
    // La lecture du fil marque les messages comme lus côté serveur : on
    // rafraîchit la liste pour que la pastille retombe tout de suite.
    setTimeout(chargerConversations, 400);
  }, [chargerConversations]);

  // Fiche du correspondant, relue à chaque conversation ouverte. Son échec
  // est sans conséquence : l'en-tête retombe alors sur « Voir le profil ».
  useEffect(() => {
    if (!actif) return undefined;
    let arrete = false;
    setFiche(null);
    apiMemberProfile(actif.pseudo || actif.user_id, token)
      .then((d) => !arrete && setFiche(d))
      .catch(() => {});
    return () => { arrete = true; };
  }, [actif, token]);

  // Le repère de non-lus ne peut se calculer qu'une fois le fil chargé : on
  // compte les derniers messages reçus, en nombre annoncé par la liste.
  useEffect(() => {
    if (!premierNonLu || premierNonLu.id || fil.length === 0) return;
    const recus = fil.filter((m) => m.from_user_id !== currentUserId);
    const premier = recus[recus.length - premierNonLu.attendus];
    if (premier) setPremierNonLu((p) => ({ ...p, id: premier.id }));
  }, [fil, premierNonLu, currentUserId]);

  // Arrivée depuis un profil (« Envoyer un message ») : on ouvre directement
  // la bonne conversation au lieu d'obliger à la retrouver dans la liste.
  useEffect(() => {
    if (!correspondant || !membres) return;
    const cible = membres.find((m) => m.id === Number(correspondant));
    if (cible) ouvrir({ user_id: cible.id, display_name: cible.display_name, avatar_url: cible.avatar_url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correspondant, membres]);

  const envoyer = async (texte) => {
    if (!actif) return;
    setErreur(null);
    try {
      await apiPostMessageTo(token, actif.user_id, texte);
      setFil(await apiGetConversationWith(token, actif.user_id));
      chargerConversations();
    } catch (e) {
      setErreur(e.message);
    }
  };

  const supprimerConversation = async () => {
    try {
      await apiSupprimerConversation(token, actif.user_id);
      setActif(null);
      setFil([]);
      setConfirmation(null);
      chargerConversations();
    } catch (e) {
      setErreur(e.message);
      setConfirmation(null);
    }
  };

  const remettreNonLue = async () => {
    try {
      await apiConversationNonLue(token, actif.user_id);
      setActif(null);
      setMenuOuvert(false);
      chargerConversations();
    } catch (e) {
      setErreur(e.message);
    }
  };

  const supprimerMessage = async (message) => {
    try {
      await apiSupprimerMessage(token, message.id);
      setFil((f) => f.filter((m) => m.id !== message.id));
      setConfirmation(null);
      chargerConversations();
    } catch (e) {
      setErreur(e.message);
      setConfirmation(null);
    }
  };

  /* La recherche porte à la fois sur les conversations existantes et sur les
     membres : chercher quelqu'un ne devrait pas dépendre du fait qu'on lui a
     déjà écrit ou non. C'est le défaut de la version précédente, où « Nouveau
     message » ouvrait une liste séparée. */
  const q = recherche.trim().toLowerCase();
  const conversationsFiltrees = useMemo(
    () => (conversations || []).filter((c) => !q || (c.display_name || "").toLowerCase().includes(q)),
    [conversations, q]
  );
  const nouveauxContacts = useMemo(() => {
    if (!q && !nouvelle) return [];
    const dejaVus = new Set((conversations || []).map((c) => c.user_id));
    return (membres || [])
      .filter((m) => !dejaVus.has(m.id))
      .filter((m) => !q || (m.display_name || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [membres, conversations, q, nouvelle]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 26px" }}>
      {/* Deux flèches de retour se superposaient sur téléphone : celle-ci et
          le chevron de la conversation, qui ne mènent pas au même endroit
          sans que rien ne le dise. Dès qu'un fil est ouvert, seule reste
          celle du fil. */}
      <button
        onClick={onBack}
        className={actif ? "rp-msg-cache-mobile" : ""}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0,
          marginBottom: 12, fontFamily: T.fontBody,
        }}
      >
        ← Accueil
      </button>

      {erreur && (
        <p style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{erreur}</p>
      )}

      <div className={`rp-messagerie ${actif ? "" : "rp-messagerie-liste"}`}>
        {/* ── Volet gauche : les conversations ── */}
        <aside className={`rp-msg-colonne ${actif ? "rp-msg-cache-mobile" : ""}`}>
          <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
              <h1 className="rp-display" style={{ fontSize: 18, fontWeight: 900, color: T.ink, margin: 0 }}>
                Messages
              </h1>
              <button
                onClick={() => { setNouvelle((v) => !v); setRecherche(""); }}
                aria-label="Nouveau message"
                title="Nouveau message"
                className="rp-pressable"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: 9, cursor: "pointer",
                  background: nouvelle ? T.ember : T.surface2,
                  border: `1px solid ${nouvelle ? "transparent" : T.line}`,
                  color: nouvelle ? "#0C0E14" : T.ink,
                }}
              >
                <Icon name={nouvelle ? "x" : "mail"} size={16} />
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", color: T.muted }}>
                <Icon name="search" size={14} />
              </span>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une conversation…"
                style={{
                  width: "100%", padding: "9px 12px 9px 33px", borderRadius: 10,
                  border: `1.5px solid ${T.line}`, background: T.surface2,
                  color: T.ink, fontSize: 13, fontFamily: T.fontBody,
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }}>
            {conversations === null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 4 }}>
                {[0, 1, 2, 3].map((i) => <div key={i} className="rp-shimmer" style={{ height: 58, borderRadius: 12 }} />)}
              </div>
            )}

            {conversations?.length === 0 && !q && !nouvelle && (
              <div style={{ padding: "26px 14px", textAlign: "center" }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 46, height: 46, borderRadius: "50%", marginBottom: 10,
                    background: `${T.purple}14`, border: `1px solid ${T.purple}3a`,
                  }}
                >
                  <Icon name="mail" size={21} color={T.purple} />
                </span>
                <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, margin: 0 }}>
                  Aucune conversation. Cherche un membre ci-dessus, ou écris-lui depuis son profil.
                </p>
              </div>
            )}

            {conversationsFiltrees.map((c) => {
              const ouverte = actif?.user_id === c.user_id;
              const deMoi = c.last_from === currentUserId;
              return (
                <button key={c.user_id} onClick={() => ouvrir(c)} style={ligneStyle(ouverte)}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar email={c.display_name} avatarUrl={c.avatar_url} size={40} />
                    {c.non_lus > 0 && (
                      <span
                        style={{
                          position: "absolute", top: -3, right: -3,
                          minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: T.red, color: "#FFF", fontSize: 10.5, fontWeight: 900,
                          border: `2px solid ${T.bg}`,
                        }}
                      >
                        {c.non_lus > 9 ? "9+" : c.non_lus}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: c.non_lus > 0 ? 900 : 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.display_name}
                      </span>
                      <span style={{ fontSize: 10.5, color: T.muted, whiteSpace: "nowrap" }}>
                        {relativeTime(c.last_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 4, marginTop: 2,
                        fontSize: 12, color: c.non_lus > 0 ? T.ink : T.muted,
                        fontWeight: c.non_lus > 0 ? 600 : 400,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {/* Accusé de lecture jusque dans la liste : savoir si son
                          dernier message a été lu évite d'ouvrir la conversation
                          pour le vérifier. */}
                      {deMoi && (
                        <Icon name="check" size={11} color={c.last_read_at ? T.green : T.muted} />
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.last_body}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {nouveauxContacts.length > 0 && (
              <>
                <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted, margin: "14px 0 6px 11px" }}>
                  Autres membres
                </p>
                {nouveauxContacts.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => ouvrir({ user_id: m.id, display_name: m.display_name, avatar_url: m.avatar_url })}
                    style={ligneStyle(false)}
                  >
                    <Avatar email={m.display_name} avatarUrl={m.avatar_url} size={36} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </span>
                  </button>
                ))}
              </>
            )}

            {q && conversationsFiltrees.length === 0 && nouveauxContacts.length === 0 && (
              <p style={{ fontSize: 12.5, color: T.muted, padding: "18px 12px", textAlign: "center" }}>
                Aucun membre ne correspond à « {recherche} ».
              </p>
            )}
          </div>
        </aside>

        {/* ── Volet droit : le fil ── */}
        <section className={`rp-msg-fil ${actif ? "" : "rp-msg-cache-mobile"}`}>
          {!actif ? (
            <div
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                textAlign: "center", height: "100%", padding: 30, background: T.bgElevated,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 58, height: 58, borderRadius: "50%", marginBottom: 14,
                  background: `${T.purple}14`, border: `1px solid ${T.purple}3a`,
                }}
              >
                <Icon name="mail" size={26} color={T.purple} />
              </span>
              <h2 className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink, marginBottom: 7 }}>
                Vos messages privés
              </h2>
              <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, maxWidth: 340, margin: 0 }}>
                Choisis une conversation à gauche, ou cherche un membre pour lui écrire.
                Ces messages ne sont lus que par la personne à qui tu écris.
              </p>
            </div>
          ) : (
            <>
              {/* En-tête du fil : sans lui, on ne sait plus à qui on écrit dès
                  que la conversation dépasse un écran. */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "10px 13px",
                  background: T.surface, borderBottom: `1px solid ${T.line}`, flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setActif(null)}
                  className="rp-msg-retour"
                  aria-label="Retour aux conversations"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: T.sub, flexShrink: 0, display: "none" }}
                >
                  <Icon name="chevronDown" size={20} style={{ transform: "rotate(90deg)" }} />
                </button>

                <button
                  onClick={() => ouvrirProfil(actif.user_id)}
                  title={`Voir le profil de ${actif.display_name}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1,
                    background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <Avatar email={actif.display_name} avatarUrl={actif.avatar_url} size={36} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {actif.display_name}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {contexteMembre(fiche) || "Voir le profil"}
                    </span>
                  </span>
                </button>

                <div style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => setMenuOuvert((v) => !v)}
                    aria-label="Actions sur la conversation"
                    aria-expanded={menuOuvert}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                      background: menuOuvert ? T.surface2 : "none", border: `1px solid ${menuOuvert ? T.line : "transparent"}`,
                      color: T.sub,
                    }}
                  >
                    <Icon name="settings" size={16} />
                  </button>
                  {menuOuvert && (
                    <div
                      className="rp-modal-in"
                      style={{
                        position: "absolute", right: 0, top: 38, zIndex: 30, minWidth: 216,
                        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11,
                        padding: 5, boxShadow: T.shadowCard,
                      }}
                    >
                      <button onClick={remettreNonLue} style={actionMenuStyle()}>
                        <Icon name="bell" size={15} color={T.sub} />
                        Marquer comme non lue
                      </button>
                      <button
                        onClick={() => { setMenuOuvert(false); setConfirmation({ type: "conversation" }); }}
                        style={actionMenuStyle(T.red)}
                      >
                        <Icon name="x" size={15} color={T.red} />
                        Supprimer la conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <MessageList
                messages={fil}
                currentUserId={currentUserId}
                pleineHauteur
                accuseLecture
                premierNonLu={premierNonLu?.id || null}
                onSupprimer={(m) => setConfirmation({ type: "message", message: m })}
                vide={
                  <div>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 52, height: 52, borderRadius: "50%", marginBottom: 12,
                        background: `${T.purple}14`, border: `1px solid ${T.purple}3a`,
                      }}
                    >
                      <Icon name="mail" size={24} color={T.purple} />
                    </span>
                    <h4 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, marginBottom: 6 }}>
                      Écris à {actif.display_name}
                    </h4>
                    <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6 }}>
                      Vous n'avez encore échangé aucun message.
                    </p>
                  </div>
                }
              />
              <MessageComposer onSend={envoyer} placeholder={`Message à ${actif.display_name}…`} autoFocus />
            </>
          )}
        </section>
      </div>

      {/* Confirmation : ces deux suppressions sont irréversibles, et la
          seconde retire un message des yeux du destinataire. */}
      {confirmation && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmation(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300, background: "rgba(3,6,12,.72)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rp-modal-in"
            style={{
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 15,
              padding: "22px 20px", maxWidth: 400,
            }}
          >
            <h3 className="rp-display" style={{ fontSize: 16, fontWeight: 900, color: T.ink, margin: "0 0 9px" }}>
              {confirmation.type === "conversation" ? "Supprimer la conversation ?" : "Supprimer ce message ?"}
            </h3>
            <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.65, margin: "0 0 18px" }}>
              {confirmation.type === "conversation" ? (
                <>
                  Elle disparaît de votre liste. {actif?.display_name} garde la sienne : les messages
                  lui appartiennent aussi. Si cette personne vous réécrit, la conversation repart de
                  son nouveau message.
                </>
              ) : (
                <>Ce message sera retiré de la conversation, pour vous comme pour votre correspondant.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmation(null)}
                style={{
                  background: "none", border: `1.5px solid ${T.line}`, borderRadius: 9,
                  padding: "9px 15px", color: T.sub, fontSize: 13, fontWeight: 800,
                  cursor: "pointer", fontFamily: T.fontBody,
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => (confirmation.type === "conversation" ? supprimerConversation() : supprimerMessage(confirmation.message))}
                className="rp-pressable"
                style={{
                  background: T.gradDanger, border: "none", borderRadius: 9,
                  padding: "9px 16px", color: "#FFF", fontSize: 13, fontWeight: 800,
                  cursor: "pointer", fontFamily: T.fontBody,
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Une ligne de contexte à partir de la fiche publique : depuis quand la
 * personne est membre, et ce qu'elle a publié. Renvoie null si la fiche
 * n'a pas pu être lue — l'en-tête retombe alors sur le libellé neutre.
 */
function contexteMembre(fiche) {
  if (!fiche?.membre) return null;
  const morceaux = [];
  const d = new Date(String(fiche.membre.createdAt || "").replace(" ", "T") + "Z");
  if (!Number.isNaN(d.getTime())) {
    morceaux.push(`Membre depuis ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`);
  }
  const publies = fiche.stats?.deals?.publies || 0;
  if (publies > 0) morceaux.push(`${publies} deal${publies > 1 ? "s" : ""}`);
  return morceaux.length > 0 ? morceaux.join(" · ") : null;
}

/** Ligne de la colonne de gauche (conversation ou membre). */
function ligneStyle(active) {
  return {
    display: "flex", alignItems: "center", gap: 11, width: "100%",
    padding: "9px 11px", marginBottom: 3, borderRadius: 12,
    background: active ? T.surface3 : "transparent",
    border: `1px solid ${active ? T.line : "transparent"}`,
    cursor: "pointer", textAlign: "left", fontFamily: T.fontBody,
    transition: "background .15s ease",
  };
}

/** Entrée du menu d'actions d'une conversation. */
function actionMenuStyle(couleur = T.ink) {
  return {
    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
    background: "none", border: "none", borderRadius: 8, padding: "10px 11px",
    cursor: "pointer", color: couleur, fontSize: 13, fontWeight: 700, fontFamily: T.fontBody,
  };
}
