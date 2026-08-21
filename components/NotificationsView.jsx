// NotificationsView.jsx — Ce que le site a fait pendant votre absence.
//
// Cette page groupait les notifications ET les messages privés sous le titre
// « Activité ». C'était juste tant que les deux n'avaient nulle part où
// vivre ; ça ne l'est plus depuis que la messagerie est une page à part et
// que l'en-tête porte les deux entrées séparément.
//
// Les deux natures n'appellent d'ailleurs pas le même geste : une
// notification se parcourt et se classe, un message attend une réponse. Les
// mélanger obligeait à lire deux listes pour savoir si quelqu'un attendait
// quelque chose de vous.
import { useEffect, useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import { apiNotifications, apiNotificationsLues } from "../api.js";
import { depuis } from "./useRadar.js";
import PageShell, { EmptyState } from "./PageShell.jsx";

/* Chaque nature a son icône et sa teinte. Une alerte de prix ne se lit pas
   comme un abonnement : la couleur porte cette différence avant le texte. */
export const NATURES = {
  reponse_forum: { icone: "message", ton: () => T.cyan },
  commentaire_deal: { icone: "message", ton: () => T.purple },
  nouvel_abonne: { icone: "users", ton: () => T.green },
  alerte_prix: { icone: "alertCircle", ton: () => T.red },
  moderation: { icone: "shield", ton: () => T.yellow },
};

/**
 * Une ligne de notification. Partagée avec le panneau déroulant de la
 * cloche : deux dessins différents pour la même information donneraient
 * l'impression de deux fonctionnalités distinctes.
 */
export function LigneNotification({ notification: n, onClick, compact = false }) {
  const nature = NATURES[n.type] || { icone: "bell", ton: () => T.sub };
  const ton = nature.ton();
  return (
    <button
      onClick={() => onClick?.(n)}
      style={{
        display: "flex", gap: 11, alignItems: "flex-start", width: "100%", textAlign: "left",
        // Le non-lu se signale par un fond, pas par une pastille de plus :
        // la liste en compterait autant que de lignes.
        background: n.lu_at ? "none" : T.surface2,
        border: `1px solid ${n.lu_at ? "transparent" : T.line}`,
        borderRadius: 11, padding: compact ? "10px 11px" : "12px 13px", cursor: "pointer",
        fontFamily: T.fontBody,
      }}
    >
      <span
        style={{
          width: compact ? 26 : 30, height: compact ? 26 : 30, borderRadius: 9, flexShrink: 0,
          background: `${ton}1c`, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name={nature.icone} size={compact ? 13 : 15} color={ton} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: compact ? 13 : 14, fontWeight: n.lu_at ? 600 : 800, color: T.ink }}>
          {n.titre}
        </span>
        {n.corps && (
          <span style={{ display: "block", fontSize: compact ? 12 : 13, color: T.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
}

export default function NotificationsView({ token, onBack, onNaviguer, onLu }) {
  const [notifications, setNotifications] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiNotifications(token)
      .then((r) => setNotifications(r.items || []))
      .catch((e) => setErreur(e.message));
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
    <PageShell
      icon="bell"
      iconColor={T.emberSolid}
      title="Notifications"
      subtitle="Les réponses à vos sujets, les commentaires sur les produits que vous suivez, vos nouveaux abonnés et vos alertes de prix."
      onBack={onBack}
      width={720}
      action={
        nonLues > 0 ? (
          <button
            onClick={toutMarquerLu}
            className="rp-pressable"
            style={{
              background: "none", border: `1px solid ${T.line}`, borderRadius: 999,
              color: T.sub, cursor: "pointer", padding: "7px 14px", fontSize: 12.5,
              fontWeight: 700, fontFamily: T.fontBody, whiteSpace: "nowrap",
            }}
          >
            Tout marquer comme lu
          </button>
        ) : null
      }
    >
      {erreur && (
        <div style={{ border: `1px solid ${T.red}55`, borderRadius: 10, padding: 12, color: T.red, fontSize: 13, marginBottom: 16 }}>
          {erreur}
        </div>
      )}

      {notifications === null ? (
        <p style={{ color: T.muted, fontSize: 13.5 }}>Chargement…</p>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          tone={T.emberSolid}
          title="Rien de neuf"
          text="Les réponses à vos sujets, les commentaires sur les produits que vous suivez et vos nouveaux abonnés apparaîtront ici."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {notifications.map((n) => (
            <LigneNotification key={n.id} notification={n} onClick={onNaviguer} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
