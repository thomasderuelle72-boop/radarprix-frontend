// admin/ui.jsx — Briques communes au tableau de bord.
//
// Le panneau admin comptait quatre blocs écrits à la main dans
// RadarPrixSite. Il en compte maintenant sept, chacun avec ses cartes, ses
// tableaux et ses actions : sans ces briques, la moitié du code serait de
// la mise en forme recopiée.
import { T } from "../../theme.js";
import Icon from "../Icon.jsx";

export const carte = {
  background: T.gradSurface,
  border: `1px solid ${T.line}`,
  borderRadius: T.radiusLg,
  padding: "18px 20px",
  marginBottom: 16,
};

export const boutonPrimaire = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
  padding: "9px 15px", borderRadius: 9, border: "none",
  background: T.ember, color: "#0C0E14", fontWeight: 900, fontSize: 12.5,
  cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
};

export const boutonSecondaire = {
  ...boutonPrimaire,
  background: "transparent", color: T.sub, border: `1.5px solid ${T.line}`,
};

export const boutonDanger = {
  ...boutonSecondaire,
  color: T.red, border: `1.5px solid ${T.red}55`,
};

export const champ = {
  padding: "9px 12px", borderRadius: 9,
  border: `1.5px solid ${T.line}`, background: T.surface2,
  color: T.ink, fontSize: 13, fontFamily: "'Inter', sans-serif",
};

/** Titre de section, avec une action facultative à droite. */
export function Titre({ children, action, aide }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>{children}</h3>
        {action}
      </div>
      {aide && <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginTop: 6, maxWidth: 640 }}>{aide}</p>}
    </div>
  );
}

/** Un chiffre clé. `ton` colore la valeur quand elle appelle une action. */
export function Chiffre({ valeur, libelle, ton, icone }) {
  return (
    <div style={{ ...carte, marginBottom: 0, padding: "16px 18px", flex: "1 1 150px", minWidth: 150 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icone && <Icon name={icone} size={15} color={ton || T.muted} />}
        <div className="rp-display" style={{ fontSize: 26, fontWeight: 900, color: ton || T.ink, lineHeight: 1 }}>
          {valeur}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: T.sub, marginTop: 6 }}>{libelle}</div>
    </div>
  );
}

/** Pastille d'état : le mot ET la couleur, jamais la couleur seule. */
export function Etat({ etat }) {
  const couleurs = {
    ok: [T.green, "opérationnel"],
    instable: [T.yellow, "instable"],
    panne: [T.red, "en panne"],
    inconnu: [T.muted, "jamais appelé"],
  };
  const [couleur, mot] = couleurs[etat] || couleurs.inconnu;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800,
        background: `${couleur}18`, border: `1px solid ${couleur}44`, color: couleur,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: couleur }} />
      {mot}
    </span>
  );
}

/** Étiquette neutre (rôle, type, motif…). */
export function Puce({ children, ton = T.sub }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800,
        background: `${ton}16`, border: `1px solid ${ton}38`, color: ton, whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** Tableau qui défile horizontalement plutôt que de déborder de la page. */
export function Tableau({ colonnes, children }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th
                key={c}
                style={{
                  textAlign: "left", fontSize: 10.5, fontWeight: 800, color: T.muted,
                  letterSpacing: ".04em", padding: "0 10px 8px", whiteSpace: "nowrap",
                  borderBottom: `1px solid ${T.line}`,
                }}
              >
                {c.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const cellule = {
  padding: "10px", fontSize: 12.5, color: T.ink,
  borderBottom: `1px solid ${T.line}`, verticalAlign: "middle",
};

/** Message d'absence, plutôt qu'un tableau vide sans explication. */
export function Rien({ children }) {
  return <p style={{ fontSize: 12.5, color: T.muted, padding: "14px 4px", lineHeight: 1.6 }}>{children}</p>;
}

/**
 * Confirmation avant une action irréversible. `window.confirm` est laid mais
 * bloquant et sans état à gérer : pour une suppression définitive, cette
 * brutalité est un avantage.
 */
export function confirmer(message) {
  return window.confirm(message);
}
