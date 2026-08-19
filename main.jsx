import React from "react";
import ReactDOM from "react-dom/client";
import RadarPrixSite from "./RadarPrixSite.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Enveloppe tout l'arbre : sans ça, la moindre erreur de rendu laisse
        le visiteur devant une page blanche sans explication. */}
    <ErrorBoundary>
      <RadarPrixSite />
    </ErrorBoundary>
  </React.StrictMode>
);
