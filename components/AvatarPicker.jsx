// AvatarPicker.jsx — Choix d'une photo de profil depuis l'appareil, avec
// redimensionnement dans le navigateur avant envoi.
//
// Pourquoi redimensionner ici : la photo est stockée telle quelle dans la
// colonne avatar_url (TEXT) du backend, et repartira ensuite dans chaque
// réponse qui contient un profil. Envoyer un JPEG d'appareil photo de 4 Mo
// encodé en base64 (~5,5 Mo de texte) rendrait le chat et les commentaires
// inutilisables. On recadre donc en carré et on réduit à 160 px : le
// résultat pèse une dizaine de kilo-octets, ce qui reste raisonnable.
//
// Le champ URL reste disponible en repli, pour qui préfère pointer une image
// déjà en ligne plutôt que d'en téléverser une.
import { useRef, useState } from "react";
import { T } from "../theme.js";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import AvatarMaison, { MOTIFS, PALETTES, jetonAvatar, lireJeton } from "./avatars.jsx";
import AvatarHunter, {
  jetonHunter, lireHunter, tirerHunter, estHunter, accorder,
  VISAGES, COIFFURES, YEUX, EXPRESSIONS, VETEMENTS, CHEFS, ACCESSOIRES, OBJETS,
  NOMS_PEAU, NOMS_CHEVEUX, NOMS_TEINTE, TEINTES,
} from "./hunters.jsx";

/* Les couches que le membre règle lui-même. Les autres — marque radar,
   effet, rareté — sont tirées au sort ou réservées à la progression :
   quatorze réglages d'affilée transformeraient le choix d'un avatar en
   formulaire administratif. */
const REGLAGES = [
  ["visage", "Visage", VISAGES.map((v) => v[0])],
  ["peau", "Teint", NOMS_PEAU],
  ["coiffure", "Coiffure", COIFFURES.map((v) => v[0])],
  ["cheveux", "Cheveux", NOMS_CHEVEUX],
  ["yeux", "Yeux", YEUX.map((v) => v[0])],
  ["expression", "Expression", EXPRESSIONS.map((v) => v[0])],
  ["vetement", "Vêtement", VETEMENTS.map((v) => v[0])],
  ["chef", "Couvre-chef", CHEFS.map((v) => v[0])],
  ["accessoire", "Accessoire", ACCESSOIRES.map((v) => v[0])],
  ["objet", "Objet", OBJETS.map((v) => v[0])],
  ["teinte", "Teinte", Object.keys(TEINTES).map((k) => NOMS_TEINTE[k])],
];

/** Une ligne de réglage : le nom de la pièce, et deux flèches pour la
 *  changer. Une grille de vignettes par couche demanderait onze grilles. */
function Reglage({ libelle, valeur, options, onChange }) {
  const aller = (pas) => onChange((valeur + pas + options.length) % options.length);
  const fleche = {
    width: 26, height: 26, borderRadius: 7, cursor: "pointer",
    border: `1.5px solid ${T.line}`, background: T.surface, color: T.ink,
    fontSize: 13, fontWeight: 800, lineHeight: 1, padding: 0,
    fontFamily: "'Inter', sans-serif",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 800, width: 74, flexShrink: 0 }}>{libelle}</span>
      <button type="button" onClick={() => aller(-1)} style={fleche} aria-label={`${libelle} précédent`}>‹</button>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.ink, textAlign: "center", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {options[valeur]}
      </span>
      <button type="button" onClick={() => aller(1)} style={fleche} aria-label={`${libelle} suivant`}>›</button>
    </div>
  );
}

const TAILLE = 160; // côté du carré final, en pixels
const POIDS_MAX = 90 * 1024; // garde-fou : au-delà, on refuse plutôt que d'envoyer

/** Recadre au centre en carré, réduit à TAILLE px, renvoie une data URL JPEG. */
function redimensionner(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Ce fichier n'est pas une image valide"));
      img.onload = () => {
        // Recadrage centré : on prend le plus grand carré possible dans
        // l'image d'origine, pour ne pas déformer le visage.
        const cote = Math.min(img.width, img.height);
        const sx = (img.width - cote) / 2;
        const sy = (img.height - cote) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = TAILLE;
        canvas.height = TAILLE;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, cote, cote, 0, 0, TAILLE, TAILLE);

        // JPEG plutôt que PNG : à cette taille, un PNG pèse 4 à 5 fois plus
        // pour un rendu identique sur une photo.
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AvatarPicker({ value, onChange, email, pseudo }) {
  const inputRef = useRef(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [modeUrl, setModeUrl] = useState(false);

  // Le choix courant, s'il vient de la panoplie : sert à cocher la bonne
  // vignette et à conserver la teinte quand on change de motif.
  const choix = lireJeton(value);
  const [teinte, setTeinte] = useState(choix?.palette.cle || PALETTES[0].cle);
  // Ouverte par défaut tant qu'aucune photo n'a été téléversée : c'est le
  // chemin le plus court vers un profil qui ne soit plus une initiale.
  const [galerie, setGalerie] = useState(!value || Boolean(choix) || estHunter(value));

  // Le chasseur en cours de composition. On part de celui déjà porté, ou
  // d'un tirage — un compositeur qui s'ouvre sur un personnage vide ne
  // donne aucune envie d'y toucher.
  const [chasseur, setChasseur] = useState(() => lireHunter(value) || tirerHunter());
  const [mode, setMode] = useState(estHunter(value) ? "chasseur" : "galerie");

  const choisirFichier = async (e) => {
    const file = e.target.files?.[0];
    // Permet de re-sélectionner le même fichier après une erreur.
    e.target.value = "";
    if (!file) return;

    setErreur(null);
    if (!file.type.startsWith("image/")) {
      setErreur("Choisis une image (JPEG, PNG, WebP…).");
      return;
    }

    setChargement(true);
    try {
      const dataUrl = await redimensionner(file);
      if (dataUrl.length > POIDS_MAX) {
        setErreur("Image trop lourde même après réduction — essaie-en une autre.");
        return;
      }
      onChange(dataUrl);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 8 }}>Avatar</label>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Avatar email={email} pseudo={pseudo} avatarUrl={value} size={64} />

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[["chasseur", "Mon chasseur", "users"], ["galerie", "Emblèmes", "sparkle"]].map(([cle, libelle, icone]) => (
              <button
                key={cle}
                type="button"
                onClick={() => { setMode(cle); setGalerie(true); if (cle === "chasseur") onChange(jetonHunter(chasseur)); }}
                className="rp-pressable"
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: galerie && mode === cle ? T.ember : T.surface2,
                  border: `1.5px solid ${galerie && mode === cle ? "transparent" : T.line}`, borderRadius: 9,
                  padding: "9px 14px", color: galerie && mode === cle ? "#0C0E14" : T.ink,
                  fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                <Icon name={icone} size={14} />
                {libelle}
              </button>
            ))}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={chargement}
              className="rp-pressable"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: T.surface2, border: `1.5px solid ${T.line}`, borderRadius: 9,
                padding: "9px 14px", color: T.ink, fontSize: 12.5, fontWeight: 800,
                cursor: chargement ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              <Icon name="share" size={14} />
              {chargement ? "Traitement…" : "Ma photo"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setErreur(null); }}
                className="rp-pressable"
                style={{
                  background: "none", border: `1.5px solid ${T.line}`, borderRadius: 9,
                  padding: "9px 12px", color: T.sub, fontSize: 12.5, fontWeight: 800,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Retirer
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModeUrl((v) => !v)}
            style={{ background: "none", border: "none", padding: 0, color: T.sub, fontSize: 11.5, fontWeight: 700, cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif" }}
          >
            {modeUrl ? "− Masquer le lien" : "+ Utiliser un lien à la place"}
          </button>
        </div>
      </div>

      {/* ── La galerie ──────────────────────────────────────────────
          La teinte d'abord, le motif ensuite : changer de couleur garde le
          motif choisi, ce qui permet d'essayer les six sans repartir de
          zéro. L'inverse — une grille de 72 vignettes — serait illisible. */}
      {galerie && mode === "chasseur" && (
        <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: T.surface2, border: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <AvatarHunter jeton={jetonHunter(chasseur)} size={104} titre="Aperçu" />
              <button
                type="button"
                onClick={() => { const c = tirerHunter(); setChasseur(c); onChange(jetonHunter(c)); }}
                className="rp-pressable"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: 9,
                  padding: "8px 12px", color: T.ink, fontSize: 12, fontWeight: 800,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                <Icon name="refresh" size={13} /> Au hasard
              </button>
            </div>

            <div style={{ flex: 1, minWidth: 210, display: "flex", flexDirection: "column", gap: 7 }}>
              {REGLAGES.map(([cle, libelle, options]) => (
                <Reglage
                  key={cle}
                  libelle={libelle}
                  valeur={chasseur[cle]}
                  options={options}
                  onChange={(v) => {
                    const c = accorder({ ...chasseur, [cle]: v });
                    setChasseur(c);
                    onChange(jetonHunter(c));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {galerie && mode === "galerie" && (
        <div
          style={{
            marginTop: 14, padding: 14, borderRadius: 12,
            background: T.surface2, border: `1px solid ${T.line}`,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {PALETTES.map((p) => (
              <button
                key={p.cle}
                type="button"
                onClick={() => { setTeinte(p.cle); if (choix) onChange(jetonAvatar(choix.motif.cle, p.cle)); }}
                aria-label={p.nom}
                aria-pressed={teinte === p.cle}
                title={p.nom}
                style={{
                  width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
                  background: p.fond, padding: 0,
                  border: teinte === p.cle ? `2.5px solid ${T.ink}` : "2.5px solid transparent",
                  boxShadow: teinte === p.cle ? `0 0 0 2px ${p.fond}` : "none",
                }}
              />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 9 }}>
            {MOTIFS.map((m) => {
              const jeton = jetonAvatar(m.cle, teinte);
              const actif = value === jeton;
              return (
                <button
                  key={m.cle}
                  type="button"
                  onClick={() => onChange(jeton)}
                  aria-label={m.nom}
                  aria-pressed={actif}
                  title={m.nom}
                  className="rp-pressable"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "7px 2px", borderRadius: 10, cursor: "pointer",
                    background: actif ? "rgba(255,106,53,0.14)" : "transparent",
                    border: `1.5px solid ${actif ? T.emberSolid : "transparent"}`,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <AvatarMaison jeton={jeton} size={38} titre={m.nom} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: actif ? T.ink : T.muted }}>{m.nom}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={choisirFichier}
        style={{ display: "none" }}
        aria-label="Choisir une photo de profil"
      />

      {modeUrl && (
        <input
          value={value?.startsWith("data:") || value?.startsWith("rp:") ? "" : value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          style={{
            width: "100%", marginTop: 10, padding: "11px 13px", borderRadius: 9,
            border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink,
            fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif",
          }}
        />
      )}

      {erreur && <p style={{ fontSize: 11.5, color: T.red, marginTop: 8 }}>{erreur}</p>}
      <p style={{ fontSize: 11, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>
        Un avatar de la galerie ne pèse rien et s'affiche partout instantanément.
        Une photo est recadrée en carré et réduite à {TAILLE} px dans ton navigateur — rien d'autre n'est envoyé.
      </p>
    </div>
  );
}
