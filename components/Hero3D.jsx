// Hero3D.jsx — Scène 3D décorative du hero : un disque radar posé à plat
// dans l'espace (rotateX), balayé par un faisceau, au-dessus duquel flottent
// des étiquettes de prix à différentes profondeurs.
//
// Entièrement en CSS 3D (perspective + transform-style: preserve-3d), sans
// bibliothèque 3D : le rendu reste léger (aucun canvas, aucun WebGL) et le
// bundle ne grossit pas. Purement décoratif → aria-hidden, aucun contenu
// utile n'est enfermé ici.
//
// La scène s'incline légèrement vers le curseur : on écrit dans des variables
// CSS via une ref plutôt que par setState, pour ne pas déclencher un rendu
// React à chaque mouvement de souris.
import { useRef, useCallback, useEffect } from "react";
import { T } from "../theme.js";

// Étiquettes flottantes, réparties de part et d'autre de la colonne de texte
// (large d'environ 560px au centre) : elles doivent encadrer le titre, jamais
// passer dessus — d'où des positions horizontales toutes au-delà de ±330px.
// z = profondeur, delay = déphasage pour que le flottement ne soit pas synchrone.
const TAGS = [
  { label: "−72%", tone: "err", x: -430, y: -96, z: 90, delay: "0s", scale: 1 },
  { label: "449 €", tone: "ink", x: -370, y: 76, z: 40, delay: "-2.1s", scale: 0.9 },
  { label: "−58%", tone: "deal", x: 425, y: -58, z: 120, delay: "-3.6s", scale: 1.05 },
  { label: "19,90 €", tone: "err", x: 360, y: 112, z: 55, delay: "-1.2s", scale: 0.86 },
  { label: "Score 94", tone: "gem", x: -335, y: -196, z: 10, delay: "-4.4s", scale: 0.82 },
  { label: "−64%", tone: "deal", x: 340, y: -208, z: 30, delay: "-5.5s", scale: 0.8 },
];

const toneStyle = {
  err: { color: T.red, border: T.red, bg: "rgba(255,52,93,.13)", glow: "rgba(255,52,93,.35)" },
  deal: { color: T.emberLight, border: T.emberSolid, bg: "rgba(255,106,26,.13)", glow: "rgba(255,106,26,.35)" },
  gem: { color: T.green, border: T.green, bg: "rgba(53,212,117,.12)", glow: "rgba(53,212,117,.3)" },
  ink: { color: T.sub, border: T.line, bg: "rgba(17,24,42,.75)", glow: "rgba(0,0,0,.3)" },
};

export default function Hero3D() {
  const stageRef = useRef(null);

  const onMove = useCallback((e) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--mx", `${(px * 13).toFixed(2)}deg`);
    el.style.setProperty("--my", `${(-py * 9).toFixed(2)}deg`);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // On écoute au niveau de la fenêtre : la scène réagit au curseur même
    // quand il survole le titre ou la barre de recherche posés par-dessus.
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [onMove]);

  return (
    <div ref={stageRef} className="rp-hero3d" aria-hidden="true">
      <div className="rp-hero3d-world">
        {/* Disque radar posé à plat */}
        <div className="rp-hero3d-disc">
          <span className="rp-hero3d-ring" style={{ inset: "0%" }} />
          <span className="rp-hero3d-ring" style={{ inset: "17%" }} />
          <span className="rp-hero3d-ring" style={{ inset: "34%" }} />
          <span className="rp-hero3d-ring" style={{ inset: "51%" }} />
          <span className="rp-hero3d-grid" />
          <span className="rp-hero3d-beam" />
          <span className="rp-hero3d-core" />
        </div>

        {/* Ondes qui montent depuis le centre du disque */}
        <span className="rp-hero3d-pulse" style={{ animationDelay: "0s" }} />
        <span className="rp-hero3d-pulse" style={{ animationDelay: "-1.6s" }} />
        <span className="rp-hero3d-pulse" style={{ animationDelay: "-3.2s" }} />

        {/* Étiquettes de prix flottantes */}
        {TAGS.map((t) => {
          const s = toneStyle[t.tone];
          return (
            <span
              key={t.label}
              className="rp-hero3d-tag"
              style={{
                "--tx": `${t.x}px`,
                "--ty": `${t.y}px`,
                "--tz": `${t.z}px`,
                "--ts": t.scale,
                animationDelay: t.delay,
                color: s.color,
                borderColor: s.border,
                background: s.bg,
                boxShadow: `0 10px 30px ${s.glow}`,
              }}
            >
              {t.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
