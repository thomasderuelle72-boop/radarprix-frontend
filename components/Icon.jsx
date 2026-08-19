// Icon.jsx — Jeu d'icônes SVG maison, en remplacement des emojis.
//
// Pourquoi : un emoji est rendu par la police système, donc il change
// complètement d'aspect entre Windows, macOS, Android et Linux (et arrive
// souvent en couleurs criardes qui ignorent la charte). Impossible d'obtenir
// un rendu pro et cohérent avec ça.
//
// Ici : tracés vectoriels uniformes (grille 24, trait 1.75, extrémités
// arrondies) qui héritent de la couleur du texte via currentColor — donc
// toujours alignés sur la palette de theme.js, quel que soit le système.
//
// Usage : <Icon name="flame" size={18} />  ou  <Icon name="star" color={T.yellow} />

const P = {
  // Navigation / sections
  // Flamme : silhouette extérieure + petite flamme intérieure. Sans le
  // second tracé, la forme se lit comme une goutte d'eau.
  flame: (
    <>
      <path d="M12 2.6c.6 2.9 2.2 4.6 4 6.1 1.8 1.5 2.8 3.3 2.8 5.3a6.8 6.8 0 1 1-13.6 0c0-1.2.4-2.3 1.1-3.2a2.6 2.6 0 0 0 2.6 2.6A2.6 2.6 0 0 0 11.5 11c0-1.4-.5-2.1-1-3-1-2.1-.2-4 1.5-5.4Z" />
      <path d="M9.2 16.6a2.9 2.9 0 0 0 5.7 0c0-1.4-1-2.3-1.5-3.3-.6 1.2-1.6 1.7-2.4 2.2-.9.5-1.4.7-1.8 1.1Z" />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5M12 15.6v.1" />
    </>
  ),
  star: <path d="m12 3.6 2.5 5.2 5.6.8-4 4 .9 5.7-5-2.7-5 2.7.9-5.7-4-4 5.6-.8Z" />,
  users: (
    <>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.5 19.4a6.2 6.2 0 0 1 12 0M16.5 6.2a3.2 3.2 0 0 1 0 6M18 19.4a6.3 6.3 0 0 0-1.8-4.4" />
    </>
  ),
  home: <path d="M4 10.4 12 4l8 6.4V19a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19Z" />,
  user: (
    <>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M5.4 19.6a6.6 6.6 0 0 1 13.2 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),

  // Étapes "Comment ça marche"
  // Radar : deux cercles concentriques, une aiguille de balayage et le point
  // central. Une spirale continue se lisait comme une cible, pas un radar.
  radar: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 12 18 6.6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.4" cy="15.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4.5v15M7 19.5h10M4 9.2h6M14 9.2h6M4 9.2 2.4 13a2.6 2.6 0 0 0 5.2 0ZM20 9.2 18.4 13a2.6 2.6 0 0 0 5.2 0Z" />
      <circle cx="12" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M10.6 4.4 2.9 17.6a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.4 4.4a1.6 1.6 0 0 0-2.8 0Z" />
      <path d="M12 10v3.6M12 17v.1" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.4-2 6.4h16S18 14 18 9Z" />
      <path d="M13.7 19.4a2 2 0 0 1-3.4 0" />
    </>
  ),

  // Données / produit
  store: (
    <>
      <path d="M4.5 9.6V19a1.4 1.4 0 0 0 1.4 1.4h12.2A1.4 1.4 0 0 0 19.5 19V9.6" />
      <path d="M3.2 9.6 4.8 4.4a.9.9 0 0 1 .9-.7h12.6a.9.9 0 0 1 .9.7l1.6 5.2a2.7 2.7 0 0 1-5.3.7 2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-1.7-.3Z" />
    </>
  ),
  package: (
    <>
      <path d="m12 3.4 8 4.3v8.6l-8 4.3-8-4.3V7.7Z" />
      <path d="M4 7.7l8 4.3 8-4.3M12 12v8.6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4.4h9v5a4.5 4.5 0 1 1-9 0Z" />
      <path d="M7.5 6.2H5a2 2 0 0 0 2.6 2.9M16.5 6.2H19a2 2 0 0 1-2.6 2.9M12 14v3.2M9 20.2h6M10 17.2h4" />
    </>
  ),
  gem: (
    <>
      <path d="M6.4 4.4h11.2l3.2 5-8.8 10.2L3.2 9.4Z" />
      <path d="M3.2 9.4h17.6M9 4.4l-1.4 5L12 19.6l4.4-10.2-1.4-5" />
    </>
  ),
  trendingDown: <path d="M3.5 7.5 10 14l3.2-3.2 7.3 7.3M20.5 13.4v4.7h-4.7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.2V12l3.2 1.9" />
    </>
  ),

  // Communauté / actions
  message: <path d="M20.4 12.6a7.4 7.4 0 0 1-8 7.4l-5.6 1.4 1.4-4.4a7.4 7.4 0 1 1 12.2-4.4Z" />,
  folder: <path d="M3.6 6.6a1.6 1.6 0 0 1 1.6-1.6h3.6l2 2.6h7.6a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z" />,
  heart: <path d="M12 20s-7.4-4.6-7.4-9.4a4.1 4.1 0 0 1 7.4-2.5 4.1 4.1 0 0 1 7.4 2.5C19.4 15.4 12 20 12 20Z" />,
  share: (
    <>
      <path d="M4 12.8V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6.2" />
      <path d="M12 15V3.6M7.8 7.8 12 3.6l4.2 4.2" />
    </>
  ),
  refresh: <path d="M20 11.4A8 8 0 1 0 19 16M20 5.4v6h-6" />,
  mail: (
    <>
      <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="1.8" />
      <path d="m3.6 7 8.4 6 8.4-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.6" width="14.4" height="9.6" rx="1.8" />
      <path d="M8.2 10.6V7.8a3.8 3.8 0 0 1 7.6 0v2.8" />
    </>
  ),
  shield: <path d="M12 3.4 5 6v6c0 4.2 3 7.2 7 8.6 4-1.4 7-4.4 7-8.6V6Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.8 1.8 0 0 1 0-3.6h.1a1.5 1.5 0 0 0 1.1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.8 1.8 0 0 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9Z" />
    </>
  ),
  sparkle: <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6-5.5-1.7L10.3 9ZM18.8 3.4l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z" />,
  check: <path d="m5 12.6 4.6 4.6L19 6.8" />,
};

export default function Icon({ name, size = 18, color, strokeWidth = 1.75, style, className, ...rest }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flexShrink: 0, display: "block", ...style }}
      {...rest}
    >
      {d}
    </svg>
  );
}
