// NotificationsMenu.jsx — Le panneau déroulant de la cloche, dans l'en-tête.
//
// Une notification se consulte d'un coup d'œil : savoir si quelque chose
// attend ne devrait pas coûter un changement de page, ni faire perdre celle
// qu'on est en train de lire. Le panneau montre les dernières, la page
// complète reste à un clic pour le reste.
import { useEffect, useRef, useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import { apiNotifications, apiNotificationsLues } from "../api.js";
import { LigneNotification } from "./NotificationsView.jsx";

const APERCU = 6;

export default function NotificationsMenu({ token, onFermer, onNaviguer, onToutVoir, onLu }) {
  const [items, setItems] = useState(null);
  const panneau = useRef(null);

  useEffect(() => {
    apiNotifications(token)
      .then((r) => setItems(r.items || []))
      .catch(() => setItems([]));
  }, [token]);

  // Un panneau ouvert par-dessus la page doit se refermer à l'Échap : c'est
  // le seul moyen d'en sortir sans viser une zone précise.
  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const nonLues = (items || []).filter((n) => !n.lu_at).length;

  const toutMarquerLu = async () => {
    try {
      await apiNotificationsLues(token);
      setItems((n) => (n || []).map((x) => ({ ...x, lu_at: "maintenant" })));
      onLu?.();
    } catch { /* le compteur se corrigera au prochain rafraîchissement */ }
  };

  return (
    <div
      ref={panneau}
      role="dialog"
      aria-label="Notifications"
      onClick={(e) => e.stopPropagation()}
      className="rp-modal-in rp-notif-panneau"
      style={{
        position: "absolute", right: 0, top: 42, zIndex: 120,
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
        boxShadow: T.shadowCard, overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "12px 14px", borderBottom: `1px solid ${T.line}`,
        }}
      >
        <span className="rp-display" style={{ fontSize: 14, fontWeight: 900, color: T.ink }}>
          Notifications
        </span>
        {nonLues > 0 && (
          <button
            onClick={toutMarquerLu}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              color: T.emberLight, fontSize: 11.5, fontWeight: 800, fontFamily: T.fontBody,
            }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div style={{ maxHeight: 380, overflowY: "auto", padding: 7, display: "flex", flexDirection: "column", gap: 4 }}>
        {items === null && <p style={{ fontSize: 12.5, color: T.muted, padding: "16px 10px" }}>Chargement…</p>}

        {items?.length === 0 && (
          <div style={{ padding: "26px 16px", textAlign: "center" }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 42, height: 42, borderRadius: "50%", marginBottom: 9,
                background: `${T.emberSolid}14`, border: `1px solid ${T.emberSolid}3a`,
              }}
            >
              <Icon name="bell" size={19} color={T.emberSolid} />
            </span>
            <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, margin: 0 }}>
              Rien de neuf. Les réponses et alertes qui vous concernent arriveront ici.
            </p>
          </div>
        )}

        {items?.slice(0, APERCU).map((n) => (
          <LigneNotification
            key={n.id}
            notification={n}
            compact
            onClick={(notif) => { onFermer(); onNaviguer(notif); }}
          />
        ))}
      </div>

      {items?.length > 0 && (
        <button
          onClick={() => { onFermer(); onToutVoir(); }}
          style={{
            width: "100%", background: T.surface2, border: "none", borderTop: `1px solid ${T.line}`,
            padding: "11px 14px", cursor: "pointer", color: T.ink, fontSize: 12.5,
            fontWeight: 800, fontFamily: T.fontBody,
          }}
        >
          Voir toutes les notifications
        </button>
      )}
    </div>
  );
}
