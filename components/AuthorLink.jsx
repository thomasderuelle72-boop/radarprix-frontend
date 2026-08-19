// AuthorLink.jsx — Un auteur (photo + pseudo) qui mène à son profil public.
//
// Le même bloc apparaissait, écrit à la main et légèrement différemment, sous
// chaque commentaire, dans le salon, sur le forum et sur les deals
// communautaires — et nulle part il n'était cliquable. C'était la principale
// raison pour laquelle les profils n'existaient pas vraiment : rien n'y menait.
import { T } from "../theme.js";
import Avatar from "./Avatar.jsx";
import { ouvrirProfil, profilNavigable } from "../routes.js";

export default function AuthorLink({
  userId,
  nom,
  avatarUrl,
  taille = 22,
  meta,          // texte secondaire : date, ancienneté…
  couleurNom = T.ink,
  tailleNom = 12,
  enColonne = false,
}) {
  // On préfère l'identifiant numérique quand on l'a : il reste valable même
  // si le membre change de pseudo par la suite.
  const cible = userId ?? nom;
  const cliquable = Boolean(cible) && profilNavigable();

  const contenu = (
    <>
      <Avatar email={nom} avatarUrl={avatarUrl} size={taille} />
      <span style={{ minWidth: 0, display: enColonne ? "block" : "inline" }}>
        <span
          className={cliquable ? "rp-author-name" : undefined}
          style={{ fontSize: tailleNom, fontWeight: 700, color: couleurNom }}
        >
          {nom}
        </span>
        {meta && (
          <span style={{ fontSize: tailleNom - 1.5, color: T.sub, marginLeft: enColonne ? 0 : 6, display: enColonne ? "block" : "inline" }}>
            {meta}
          </span>
        )}
      </span>
    </>
  );

  if (!cliquable) {
    return (
      <span style={{ display: "inline-flex", alignItems: enColonne ? "flex-start" : "center", gap: 8, minWidth: 0 }}>
        {contenu}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); ouvrirProfil(cible); }}
      title={`Voir le profil de ${nom}`}
      style={{
        display: "inline-flex", alignItems: enColonne ? "flex-start" : "center", gap: 8,
        background: "none", border: "none", padding: 0, margin: 0, minWidth: 0,
        cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit",
      }}
    >
      {contenu}
    </button>
  );
}
