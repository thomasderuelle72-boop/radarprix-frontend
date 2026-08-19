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
      <label style={{ display: "block", fontSize: 11.5, color: T.sub, marginBottom: 8 }}>Photo de profil</label>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Avatar email={email} pseudo={pseudo} avatarUrl={value} size={64} />

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
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
              {chargement ? "Traitement…" : value ? "Changer la photo" : "Choisir une photo"}
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
          value={value?.startsWith("data:") ? "" : value || ""}
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
        L'image est recadrée en carré et réduite à {TAILLE} px dans ton navigateur — rien d'autre n'est envoyé.
      </p>
    </div>
  );
}
