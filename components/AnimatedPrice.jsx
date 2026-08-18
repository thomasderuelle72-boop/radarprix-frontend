// AnimatedPrice.jsx — le prix descend en douceur du prix barré vers le prix
// final au premier rendu (ease-out), pour souligner visuellement la remise.
// Respecte prefers-reduced-motion et affiche directement `to` si `from` n'est
// pas strictement supérieur (rien à animer).
import { useEffect, useState } from "react";

export default function AnimatedPrice({ from, to, className, style }) {
  const [value, setValue] = useState(from > to ? from : to);

  useEffect(() => {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !(from > to)) {
      setValue(to);
      return;
    }
    let raf;
    const duration = 700;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(from - (from - to) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);

  return (
    <span className={className} style={style}>
      {value.toFixed(2).replace(".", ",")} €
    </span>
  );
}
