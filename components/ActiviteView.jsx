// ActiviteView.jsx — Tout ce qui attend le membre, au même endroit.
//
// Les notifications et les messages privés vivaient dans deux recoins
// différents du site : les uns nulle part, les autres derrière le menu
// Communauté. Or ils répondent à la même question, et c'est celle qu'on se
// pose en ouvrant une application : qu'est-ce qui s'est passé sans moi ?
//
// Les deux restent distincts à l'affichage — un message appelle une réponse,
// une notification appelle un coup d'œil — mais ils se consultent d'un même
// geste, et se comptent dans une même pastille.
import { useEffect, useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import { apiNotifications, apiNotificationsLues, apiGetConversations } from "../api.js";
import { depuis } from "./useRadar.js";
import Avatar from "./Avatar.jsx";

/* Chaque nature a son icône et sa teinte. Une alerte de prix ne se lit pas
   comme un abonnement : la couleur porte cette différence avant le texte. */
const NATURES = {
  reponse_forum: { icone: "message", ton: () => T.cyan },
  commentaire_deal: { icone: "message", ton: () => T.purple },
  nouvel_abonne: { icone: "users", ton: () => T.green },
  alerte_prix: { icone: "alertCircle", ton: () => T.red },
  moderation: { icone: "shield", ton: () => T.yellow },
};

export default function ActiviteView({ token, onBack, onOuvrirConversation, onNaviguer, onLu }) {
  const [notifications, setNotifications] = useState(null);
  const [conversations, setConversations] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiNotifications(token)
      .then((r) => setNotifications(r.items || []))
      .catch((e) => setErreur(e.message));
    apiGetConversations(token)
      .then((r) => setConversations(r.items || []))
      // Les conversations sont secondaires ici : leur échec ne doit pas
      // masquer les notifications, qui sont le cœur de cette vue.
      .catch(() => setConversations([]));
  }, [token]);

  async function toutMarquerLu() {
    try {
      await apiNotificationsLues(token);
      setNotifications((n) => (n || []).map((x) => ({ ...x, lu_at: "maintenant" })));
      onLu?.();
    } catch (e) {
      setErreur(e.message);
    }
  }

  const nonLues = (notifications || []).filter((n) => !n.lu_at).length;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", color: T.sub, cursor: "pointer",
          padding: "18px 0 10px", fontSize: 14, fontWeight: 700,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        ← Accueil
      </button>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="rp-display" style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", color: T.ink }}>
          Activité
        </h1>
        {nonLues > 0 && (
          <button
            onClick={toutMarquerLu}
            style={{
              background: "none", border: `1px solid ${T.line}`, borderRadius: 999,
              color: T.sub, cursor: "pointer", padding: "5px 12px", fontSize: 12.5,
              fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      <p style={{ color: T.sub, margin: "0 0 22px", fontSize: 14.5 }}>
        Les réponses, abonnements et alertes qui vous concernent, et vos conversations.
      </p>

      {erreur && (
        <div style={{ border: `1px solid ${T.red}55`, borderRadius: 10, padding: 12, color: T.red, fontSize: 13, marginBottom: 16 }}>
          {erreur}
        </div>
      )}

      {/* ── Notifications ── */}
      <section style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", color: T.muted, margin: "0 0 10px" }}>
          Notifications
        </h2>

        {notifications === null ? (
          <p style={{ color: T.muted, fontSize: 13.5 }}>Chargement…</p>
        ) : notifications.length === 0 ? (
          <p style={{ color: T.muted, fontSize: 13.5, padding: "14px 0" }}>
            Rien pour l'instant. Les réponses à vos sujets, les commentaires sur les produits que vous
            suivez et vos nouveaux abonnés apparaîtront ici.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {notifications.map((n) => {
              const nature = NATURES[n.type] || { icone: "bell", ton: () => T.sub };
              const ton = nature.ton();
              return (
                <button
                  key={n.id}
                  onClick={() => onNaviguer?.(n)}
                  style={{
                    display: "flex", gap: 12, alignItems: "flex-start", width: "100%", textAlign: "left",
                    // Le non-lu se signale par un fond, pas par une pastille de
                    // plus : la liste en compterait autant que de lignes.
                    background: n.lu_at ? "none" : T.surface,
                    border: `1px solid ${n.lu_at ? "transparent" : T.line}`,
                    borderRadius: 11, padding: "12px 13px", cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <span
                    style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                      background: `${ton}1c`, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon name={nature.icone} size={15} color={ton} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: n.lu_at ? 600 : 800, color: T.ink }}>
                      {n.titre}
                    </span>
                    {n.corps && (
                      <span style={{ display: "block", fontSize: 13, color: T.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.corps}
                      </span>
                    )}
                    <span style={{ display: "block", fontSize: 11.5, color: T.muted, marginTop: 3 }}>
                      {n.acteur_pseudo ? `${n.acteur_pseudo} · ` : ""}
                      {depuis(n.created_at) || ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Conversations ── */}
      <section>
        <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", color: T.muted, margin: "0 0 10px" }}>
          Messages privés
        </h2>

        {conversations === null ? (
          <p style={{ color: T.muted, fontSize: 13.5 }}>Chargement…</p>
        ) : conversations.length === 0 ? (
          <p style={{ color: T.muted, fontSize: 13.5, padding: "14px 0" }}>
            Aucune conversation. Vous pouvez écrire à un membre depuis son profil.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {conversations.map((c) => (
              <button
                key={c.id || c.user_id}
                onClick={() => onOuvrirConversation?.(c)}
                style={{
                  display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left",
                  background: c.non_lus > 0 ? T.surface : "none",
                  border: `1px solid ${c.non_lus > 0 ? T.line : "transparent"}`,
                  borderRadius: 11, padding: "11px 13px", cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <Avatar avatarUrl={c.avatar_url} pseudo={c.pseudo} size={32} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: c.non_lus > 0 ? 800 : 600, color: T.ink }}>
                    {c.pseudo || `Membre #${c.user_id}`}
                  </span>
                  {c.dernier && (
                    <span style={{ display: "block", fontSize: 13, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.dernier}
                    </span>
                  )}
                </span>
                {c.non_lus > 0 && (
                  <span
                    style={{
                      minWidth: 19, height: 19, padding: "0 5px", borderRadius: 999,
                      background: T.emberSolid, color: "#fff", fontSize: 10.5, fontWeight: 900,
                      lineHeight: "19px", textAlign: "center", fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {c.non_lus}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
