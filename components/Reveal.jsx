// Reveal.jsx — fait apparaître son contenu en fondu quand il entre dans
// l'écran (IntersectionObserver), via la classe .reveal-on-scroll définie
// dans GlobalStyles (RadarPrixSite.jsx). Se déclenche une seule fois.
import { useEffect, useRef, useState } from "react";

export default function Reveal({ children, style }) {
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
    <div ref={ref} className={`reveal-on-scroll ${visible ? "revealed" : ""}`} style={style}>
      {children}
    </div>
  );
}
