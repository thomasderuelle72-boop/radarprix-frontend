// Tilt3D.jsx — Enveloppe un élément dans un plan 3D qui s'incline vers le
// curseur (rotateX/rotateY calculés depuis la position de la souris sur la
// carte), avec un reflet lumineux qui suit le pointeur.
//
// Pourquoi en JS plutôt qu'en CSS pur : l'inclinaison dépend de la position
// exacte du curseur DANS l'élément, une information que le CSS seul n'expose
// pas. On écrit directement dans les variables CSS (pas de setState) pour
// éviter un rendu React à chaque mouvement de souris.
//
// Respecte prefers-reduced-motion : l'effet est simplement désactivé (aucun
// listener posé), la carte reste parfaitement utilisable à plat.
import { useRef, useCallback } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Tilt3D({
  children,
  max = 9, // amplitude d'inclinaison en degrés
  lift = 10, // translation vers l'avant (px) au survol
  glare = true,
  className = "",
  style,
  ...rest
}) {
  const ref = useRef(null);
  const reduced = useRef(prefersReducedMotion());

  const onMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || reduced.current) return;
      const r = el.getBoundingClientRect();
      // Position du curseur ramenée sur [-0.5, 0.5] dans les deux axes.
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      // L'axe Y du curseur pilote rotateX (et inversement) : bouger la souris
      // vers le haut doit faire basculer le haut de la carte vers l'arrière.
      el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
    },
    [max]
  );

  const onEnter = useCallback(() => {
    const el = ref.current;
    if (!el || reduced.current) return;
    el.style.setProperty("--tz", `${lift}px`);
    el.style.setProperty("--glare-o", glare ? "1" : "0");
  }, [lift, glare]);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--tz", "0px");
    el.style.setProperty("--glare-o", "0");
  }, []);

  return (
    <div
      ref={ref}
      className={`rp-tilt3d ${className}`}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={style}
      {...rest}
    >
      <div className="rp-tilt3d-inner">
        {children}
        {glare && <span aria-hidden="true" className="rp-tilt3d-glare" />}
      </div>
    </div>
  );
}
