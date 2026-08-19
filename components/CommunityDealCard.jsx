// CommunityDealCard.jsx — Une trouvaille postée par un membre.
//
// Extraite de RadarPrixSite.jsx : la même carte est désormais affichée à
// deux endroits (la page Communauté et l'onglet "Deals" d'un profil de
// membre). La dupliquer aurait garanti qu'elles divergent à la première
// retouche.
//
// Elle diffère volontairement de DealCard : ici, rien n'est mesuré par
// l'algorithme. C'est un membre qui affirme avoir trouvé une bonne affaire,
// et ce sont les votes des autres qui en décident. D'où la colonne de vote
// en évidence à gauche, et l'auteur affiché sans ambiguïté.
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import AuthorLink from "./AuthorLink.jsx";
import { dateLongue, estExpire, relativeTime } from "../utils.js";

/** Bouton de vote : discret au repos, coloré une fois le vote exprimé. */
export function voteBtnStyle(active, isDown) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 28,
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    background: active ? (isDown ? "rgba(255,59,48,0.18)" : "rgba(47,217,139,0.18)") : "transparent",
    color: active ? (isDown ? T.red : T.green) : T.sub,
    transition: "background .15s ease, color .15s ease",
  };
}

export default function CommunityDealCard({ deal: d, index = 0, onVote, showAuthor = true }) {
  const score = (d.upvotes || 0) - (d.downvotes || 0);
  const expire = estExpire(d.expires_at);

  return (
    <div
      className="fade-up"
      style={{
        display: "flex", gap: 14,
        background: T.gradSurface, border: `1px solid ${T.line}`,
        borderRadius: T.radiusLg, padding: 16, boxShadow: T.shadowCard,
        animationDelay: `${index * 60}ms`,
        // Une offre terminée reste consultable — elle fait partie de
        // l'historique du membre — mais ne doit plus attirer l'œil.
        opacity: expire ? 0.62 : 1,
      }}
    >
      {/* Colonne de vote : c'est l'interaction principale de cette page,
          elle faisait quelques pixels de haut et passait inaperçue. */}
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0,
          background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12,
          padding: "8px 6px", alignSelf: "flex-start",
        }}
      >
        <button onClick={() => onVote?.(d, 1)} aria-label="Voter pertinent" style={voteBtnStyle(d.myVote === 1)}>
          <Icon name="chevronUp" size={18} />
        </button>
        <span
          className="rp-display"
          style={{ fontWeight: 900, fontSize: 15, color: score > 0 ? T.green : score < 0 ? T.red : T.ink, lineHeight: 1 }}
        >
          {score > 0 ? `+${score}` : score}
        </span>
        <button onClick={() => onVote?.(d, -1)} aria-label="Voter pas pertinent" style={voteBtnStyle(d.myVote === -1, true)}>
          <Icon name="chevronDown" size={18} />
        </button>
      </div>

      {/* Visuel du produit : le champ existait déjà en base mais n'était
          jamais affiché, ce qui rendait la liste très terne. */}
      {d.image_url && (
        <div
          style={{
            width: 78, height: 78, flexShrink: 0, borderRadius: 11,
            background: T.surface2, border: `1px solid ${T.line}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", alignSelf: "flex-start",
          }}
        >
          <img
            src={d.image_url}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{d.title}</h3>
            {d.seller && <span style={{ fontSize: 11, color: T.sub }}>chez {d.seller}</span>}
          </div>
          {d.price != null && (
            <span style={{ fontWeight: 900, color: T.emberSolid, whiteSpace: "nowrap" }}>
              {Number(d.price).toFixed(2)} €
            </span>
          )}
        </div>

        {d.description && <p style={{ fontSize: 13, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>{d.description}</p>}

        {/* Fin d'offre : l'information la plus utile après le prix. Sans
            elle, un membre clique sur une promotion terminée depuis une
            semaine et perd confiance dans le site. */}
        {d.expires_at && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, marginTop: 9,
              padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              background: expire ? "rgba(255,52,93,.10)" : "rgba(0,229,255,.08)",
              border: `1px solid ${expire ? "rgba(255,52,93,.28)" : "rgba(0,229,255,.22)"}`,
              color: expire ? T.red : T.cyan,
            }}
          >
            <Icon name="clock" size={13} />
            {expire ? "Offre terminée" : `Se termine le ${dateLongue(d.expires_at)}`}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
          {showAuthor && (
            <AuthorLink
              userId={d.user_id}
              nom={d.author}
              avatarUrl={d.avatar_url}
              taille={20}
              tailleNom={11.5}
              meta={`· ${relativeTime(d.created_at) || d.created_at?.slice(0, 10)}`}
            />
          )}
          {!showAuthor && (
            <span style={{ fontSize: 11.5, color: T.sub }}>
              {relativeTime(d.created_at) || d.created_at?.slice(0, 10)}
            </span>
          )}
          {d.url && (
            <a
              href={d.url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: T.emberSolid, fontWeight: 800, marginLeft: "auto" }}
            >
              Voir l'offre →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
