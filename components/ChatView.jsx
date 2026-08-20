// ChatView.jsx — Salon général et messages privés.
//
// Remplace la vue écrite en ligne dans RadarPrixSite : une boîte grise, des
// lignes "pseudo : texte", un champ d'une ligne, et pour les messages privés
// une liste de membres qui remplaçait la conversation à l'écran — impossible
// de voir avec qui on parlait tout en lisant le fil.
//
// Ici : deux volets côte à côte sur écran large (conversations à gauche, fil
// à droite), empilés sur téléphone où l'on passe de la liste au fil avec un
// retour. Le fil lui-même est confié à MessageList, partagé avec le salon.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { T } from "../theme.js";
import {
  apiGetPublicChat, apiPostPublicChat, apiGetMembers,
  apiGetConversations, apiGetConversationWith, apiPostMessageTo,
} from "../api.js";
import PageShell from "./PageShell.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import MessageList from "./MessageList.jsx";
import MessageComposer from "./MessageComposer.jsx";
import { relativeTime } from "../utils.js";

const SONDAGE_SALON = 4000;
const SONDAGE_FIL = 5000;
const SONDAGE_LISTE = 9000;

/** Bloc d'accueil d'un fil vide — le même dessin partout. */
function Vide({ icone, tone, titre, texte }) {
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 52, height: 52, borderRadius: "50%", marginBottom: 12,
          background: `${tone}14`, border: `1px solid ${tone}3a`,
        }}
      >
        <Icon name={icone} size={24} color={tone} />
      </span>
      <h4 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, marginBottom: 6 }}>{titre}</h4>
      <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6 }}>{texte}</p>
    </>
  );
}

export default function ChatView({ token, currentUserId, onBack, onGoTo, correspondant, subnav }) {
  const [onglet, setOnglet] = useState(correspondant ? "prives" : "salon");
  const [erreur, setErreur] = useState(null);

  // ── Salon général ────────────────────────────────────────────
  const [salon, setSalon] = useState([]);
  const dernierId = useRef(0);

  useEffect(() => {
    if (onglet !== "salon") return;
    let arrete = false;
    const sonder = async () => {
      try {
        const arrivees = await apiGetPublicChat(dernierId.current);
        if (arrete || arrivees.length === 0) return;
        dernierId.current = arrivees[arrivees.length - 1].id;
        setSalon((p) => [...p, ...arrivees]);
      } catch { /* le réseau peut hoqueter : le sondage suivant rattrapera */ }
    };
    sonder();
    const t = setInterval(sonder, SONDAGE_SALON);
    return () => { arrete = true; clearInterval(t); };
  }, [onglet]);

  const envoyerSalon = async (texte) => {
    setErreur(null);
    try {
      await apiPostPublicChat(token, texte);
      // On ne rajoute pas le message à la main : le sondage le rapportera
      // avec son identifiant et sa date réels, ce qui évite un doublon
      // fugace puis un remplacement à l'écran.
    } catch (e) {
      setErreur(e.message);
    }
  };

  // ── Messages privés ──────────────────────────────────────────
  const [conversations, setConversations] = useState(null);
  const [membres, setMembres] = useState(null);
  const [actif, setActif] = useState(null);       // { user_id, display_name, avatar_url }
  const [fil, setFil] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [nouvelle, setNouvelle] = useState(false);

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
    if (onglet !== "prives") return;
    chargerConversations();
    apiGetMembers(token).then(setMembres).catch(() => setMembres([]));
    const t = setInterval(chargerConversations, SONDAGE_LISTE);
    return () => clearInterval(t);
  }, [onglet, token, chargerConversations]);

  // Fil ouvert : rechargé régulièrement pour que la réponse d'en face
  // arrive sans avoir à quitter puis rouvrir la conversation.
  useEffect(() => {
    if (!actif) return;
    let arrete = false;
    const relire = async () => {
      try {
        const items = await apiGetConversationWith(token, actif.user_id);
        if (!arrete) setFil(items);
      } catch { /* idem : on retentera */ }
    };
    relire();
    const t = setInterval(relire, SONDAGE_FIL);
    return () => { arrete = true; clearInterval(t); };
  }, [actif, token]);

  // Arrivée depuis un profil ("Envoyer un message") : on ouvre directement
  // la bonne conversation au lieu d'obliger à la retrouver dans la liste.
  useEffect(() => {
    if (!correspondant || !membres) return;
    const cible = membres.find((m) => m.id === Number(correspondant));
    if (cible) ouvrir({ user_id: cible.id, display_name: cible.display_name, avatar_url: cible.avatar_url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correspondant, membres]);

  const ouvrir = (personne) => {
    setActif(personne);
    setFil([]);
    setNouvelle(false);
    setErreur(null);
    // La lecture du fil marque les messages comme lus côté serveur : on
    // rafraîchit la liste pour que la pastille disparaisse tout de suite.
    setTimeout(chargerConversations, 400);
  };

  const envoyerPrive = async (texte) => {
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

  // Membres avec qui aucune conversation n'existe encore, filtrés par la
  // recherche : c'est la seule façon de démarrer un premier échange.
  const candidats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (membres || [])
      .filter((m) => !q || (m.display_name || "").toLowerCase().includes(q))
      .slice(0, 40);
  }, [membres, recherche]);

  const nonLusTotal = (conversations || []).reduce((n, c) => n + (c.non_lus || 0), 0);

  return (
    <PageShell
      icon="message"
      iconColor={T.cyan}
      title="Salon & messages"
      subtitle="Le salon général est ouvert à tous les membres. Les messages privés ne sont lus que par la personne à qui tu écris."
      onBack={onBack}
      width={980}
      subnav={subnav}
    >
      {/* Salon / privés */}
      <div style={{ display: "flex", gap: 5, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 5, marginBottom: 18 }}>
        {[
          { id: "salon", libelle: "Salon général", icone: "message" },
          { id: "prives", libelle: "Messages privés", icone: "mail", badge: nonLusTotal },
        ].map((o) => {
          const actifOnglet = onglet === o.id;
          return (
            <button
              key={o.id}
              onClick={() => { setOnglet(o.id); setErreur(null); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                flex: 1, padding: "10px 14px", borderRadius: 8, border: "none",
                background: actifOnglet ? T.ember : "transparent",
                color: actifOnglet ? "#0C0E14" : T.sub,
                fontWeight: actifOnglet ? 900 : 700, fontSize: 13,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              <Icon name={o.icone} size={15} />
              {o.libelle}
              {o.badge > 0 && (
                <span
                  style={{
                    minWidth: 19, height: 19, padding: "0 5px", borderRadius: 999,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: actifOnglet ? "#0C0E14" : T.red,
                    color: actifOnglet ? T.emberLight : "#FFF",
                    fontSize: 11, fontWeight: 900,
                  }}
                >
                  {o.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {erreur && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 12 }}>{erreur}</p>}

      {onglet === "salon" && (
        <>
          <MessageList
            messages={salon}
            currentUserId={currentUserId}
            hauteur={440}
            vide={
              <Vide
                icone="message"
                tone={T.cyan}
                titre="Le salon est calme"
                texte="Personne n'a encore écrit. Une question sur un deal, un retour sur une commande : lance la discussion."
              />
            }
          />
          <MessageComposer onSend={envoyerSalon} placeholder="Écris au salon général…" />
        </>
      )}

      {onglet === "prives" && (
        <div className="rp-mp">
          {/* ── Volet gauche : conversations ── */}
          <aside className={`rp-mp-liste ${actif ? "rp-mp-cache-mobile" : ""}`}>
            <button
              onClick={() => { setNouvelle((v) => !v); setActif(null); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "10px 14px", marginBottom: 10,
                borderRadius: 10, border: `1.5px solid ${nouvelle ? T.emberSolid : T.line}`,
                background: "transparent", color: nouvelle ? T.emberLight : T.ink,
                fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              <Icon name="mail" size={15} />
              {nouvelle ? "Annuler" : "Nouveau message"}
            </button>

            {nouvelle && (
              <>
                <input
                  autoFocus
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Chercher un membre…"
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 10, marginBottom: 8,
                    border: `1.5px solid ${T.line}`, background: T.surface2,
                    color: T.ink, fontSize: 13, fontFamily: "'Inter', sans-serif",
                  }}
                />
                {membres === null && <p style={{ fontSize: 12, color: T.muted }}>Chargement…</p>}
                {membres?.length === 0 && (
                  <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                    Aucun autre membre inscrit pour l'instant.
                  </p>
                )}
                {candidats.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => ouvrir({ user_id: m.id, display_name: m.display_name, avatar_url: m.avatar_url })}
                    style={ligneStyle(false)}
                  >
                    <Avatar email={m.display_name} avatarUrl={m.avatar_url} size={34} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </span>
                  </button>
                ))}
              </>
            )}

            {!nouvelle && conversations === null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[0, 1, 2].map((i) => <div key={i} className="rp-shimmer" style={{ height: 58, borderRadius: 12 }} />)}
              </div>
            )}

            {!nouvelle && conversations?.length === 0 && (
              <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.65, padding: "8px 4px" }}>
                Aucune conversation. « Nouveau message » pour écrire à un membre — ou passe par le
                bouton « Envoyer un message » de son profil.
              </p>
            )}

            {!nouvelle && conversations?.map((c) => {
              const ouverte = actif?.user_id === c.user_id;
              const deMoi = c.last_from === currentUserId;
              return (
                <button key={c.user_id} onClick={() => ouvrir(c)} style={ligneStyle(ouverte)}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar email={c.display_name} avatarUrl={c.avatar_url} size={38} />
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
                        {c.non_lus}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: c.non_lus > 0 ? 900 : 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.display_name}
                      </span>
                      <span style={{ fontSize: 10.5, color: T.muted, whiteSpace: "nowrap" }}>
                        {relativeTime(c.last_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11.5, color: c.non_lus > 0 ? T.sub : T.muted, marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {deMoi && <span style={{ color: T.muted }}>Vous : </span>}
                      {c.last_body}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* ── Volet droit : le fil ── */}
          <section className={`rp-mp-fil ${actif ? "" : "rp-mp-cache-mobile"}`}>
            {!actif ? (
              <div
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  textAlign: "center", height: "100%", minHeight: 320, padding: 26,
                  background: T.bgElevated, border: `1px dashed ${T.line}`, borderRadius: T.radiusLg,
                }}
              >
                <Vide
                  icone="mail"
                  tone={T.purple}
                  titre="Aucune conversation ouverte"
                  texte="Choisis une conversation à gauche pour la lire ici."
                />
              </div>
            ) : (
              <>
                {/* En-tête du fil : sans lui, on ne sait plus à qui on écrit
                    dès que le fil dépasse un écran. */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 11,
                    padding: "11px 14px",
                    background: T.surface, border: `1px solid ${T.line}`, borderBottom: "none",
                    borderRadius: `${T.radiusLg}px ${T.radiusLg}px 0 0`,
                  }}
                >
                  <button
                    onClick={() => setActif(null)}
                    className="rp-mp-retour"
                    aria-label="Retour aux conversations"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: T.sub, flexShrink: 0 }}
                  >
                    <Icon name="chevronDown" size={20} style={{ transform: "rotate(90deg)" }} />
                  </button>
                  <Avatar email={actif.display_name} avatarUrl={actif.avatar_url} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {actif.display_name}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted }}>Conversation privée</div>
                  </div>
                </div>

                <MessageList
                  messages={fil}
                  currentUserId={currentUserId}
                  hauteur={368}
                  vide={
                    <Vide
                      icone="mail"
                      tone={T.purple}
                      titre={`Écris à ${actif.display_name}`}
                      texte="Vous n'avez encore échangé aucun message."
                    />
                  }
                />
                <MessageComposer onSend={envoyerPrive} placeholder={`Message à ${actif.display_name}…`} autoFocus />
              </>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}

/** Ligne de la colonne de gauche (conversation ou membre). */
function ligneStyle(active) {
  return {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "9px 11px", marginBottom: 6, borderRadius: 12,
    background: active ? T.surface3 : "transparent",
    border: `1px solid ${active ? T.line : "transparent"}`,
    cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif",
    transition: "background .15s ease",
  };
}
