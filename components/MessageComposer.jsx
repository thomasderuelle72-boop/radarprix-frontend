// MessageComposer.jsx — Champ de saisie d'un message.
//
// L'ancien champ était un <input> d'une seule ligne : un message un peu long
// défilait dans une fente de quelques centimètres, sans qu'on puisse le
// relire ni aller à la ligne. Ici, une zone qui grandit avec le texte
// jusqu'à cinq lignes, puis défile.
//
// Entrée envoie, Maj+Entrée passe à la ligne — la convention de toutes les
// messageries. Sur mobile en revanche, Entrée doit passer à la ligne : le
// clavier virtuel n'offre pas de Maj+Entrée, et l'envoi se fait au bouton.
import { useRef, useState, useEffect } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";

const MAX = 500;
const LIGNES_MAX = 5;

const estTactile = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

export default function MessageComposer({ onSend, placeholder = "Écris un message…", disabled, autoFocus }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const zone = useRef(null);
  const tactile = useRef(estTactile());

  // Hauteur ajustée au contenu : on remet à zéro avant de mesurer, sinon la
  // zone ne rétrécit jamais quand on efface du texte.
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    el.style.height = "auto";
    const ligne = 21;
    el.style.height = `${Math.min(el.scrollHeight, ligne * LIGNES_MAX + 20)}px`;
  }, [texte]);

  const envoyer = async () => {
    const propre = texte.trim();
    if (!propre || envoi || disabled) return;
    setEnvoi(true);
    try {
      await onSend(propre);
      setTexte("");
    } finally {
      setEnvoi(false);
      zone.current?.focus();
    }
  };

  const auClavier = (e) => {
    if (e.key !== "Enter" || e.shiftKey || tactile.current) return;
    e.preventDefault();
    envoyer();
  };

  const reste = MAX - texte.length;
  const pret = texte.trim().length > 0 && !disabled;

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-end", gap: 10,
        padding: "11px 12px",
        background: T.surface, border: `1px solid ${T.line}`,
        borderRadius: `0 0 ${T.radiusLg}px ${T.radiusLg}px`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          ref={zone}
          value={texte}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(e) => setTexte(e.target.value.slice(0, MAX))}
          onKeyDown={auClavier}
          rows={1}
          className="rp-fil-saisie"
          placeholder={placeholder}
          style={{
            width: "100%", resize: "none", overflowY: "auto",
            padding: "9px 12px", borderRadius: 12,
            border: `1.5px solid ${T.line}`, background: T.surface2,
            color: T.ink, fontSize: 13.5, lineHeight: 1.55,
            fontFamily: "'Inter', sans-serif",
            transition: "border-color .15s ease, box-shadow .15s ease",
          }}
        />
        {/* Le compteur n'apparaît qu'à l'approche de la limite : affiché en
            permanence, il donnerait l'impression d'un formulaire. */}
        {reste <= 80 && (
          <div style={{ fontSize: 10.5, color: reste <= 0 ? T.red : T.muted, marginTop: 4, paddingLeft: 4 }}>
            {reste} caractère{Math.abs(reste) > 1 ? "s" : ""} restant{Math.abs(reste) > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <button
        onClick={envoyer}
        disabled={!pret || envoi}
        aria-label="Envoyer le message"
        className="rp-pressable"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, flexShrink: 0, borderRadius: 12, border: "none",
          background: pret ? T.ember : T.surface2,
          color: pret ? "#0C0E14" : T.muted,
          cursor: pret && !envoi ? "pointer" : "default",
          transition: "background .18s ease, color .18s ease",
        }}
      >
        {/* Flèche vers le haut : l'icône de partage tournée, plutôt qu'un
            libellé "Envoyer" qui déborde sur écran étroit. */}
        <Icon name="chevronUp" size={19} />
      </button>
    </div>
  );
}
