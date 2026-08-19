// Reveal.jsx — fait apparaître son contenu quand il entre dans l'écran
// (IntersectionObserver), via les classes .reveal-on-scroll (fondu simple)
// ou .reveal-3d (fondu + redressement en perspective), définies dans
// GlobalStyles (RadarPrixSite.jsx). Se déclenche une seule fois.
//
// Props :
//   depth — utilise la variante 3D (la carte se redresse vers le lecteur)
//   delay — décalage en ms, pour faire arriver une grille en cascade
import { useEffect, useRef, useState } from "react";

export default function Reveal({ children, style, depth = false, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${depth ? "reveal-3d" : "reveal-on-scroll"} ${visible ? "revealed" : ""}`}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    >
      {children}
    </div>
  );
}
