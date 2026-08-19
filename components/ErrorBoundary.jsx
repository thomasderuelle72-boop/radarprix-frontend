// ErrorBoundary.jsx — Filet de sécurité : sans lui, une seule erreur de
// rendu dans n'importe quel composant vide entièrement la page et le
// visiteur se retrouve devant un écran blanc, sans message ni recours.
//
// Doit rester une classe : React n'expose pas encore d'équivalent en
// composant fonction (pas de hook componentDidCatch).
import { Component } from "react";
import { T } from "../theme.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Pas de service de suivi d'erreurs branché pour l'instant : la console
    // reste le seul endroit où retrouver la pile d'appels d'un incident.
    console.error("[RadarPrix] Erreur de rendu :", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          color: T.ink,
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 62, height: 62, borderRadius: "50%", margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,52,93,.12)", border: `1px solid ${T.red}55`,
            }}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={T.red} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.6 4.4 2.9 17.6a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.4 4.4a1.6 1.6 0 0 0-2.8 0Z" />
              <path d="M12 10v3.6M12 17v.1" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily: "'Unbounded', system-ui, sans-serif",
              fontSize: 21, fontWeight: 900, marginBottom: 12,
            }}
          >
            Cette page a planté
          </h1>
          <p style={{ color: T.sub, fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
            Un incident inattendu a interrompu l'affichage. Rien n'est perdu côté
            compte ni favoris — recharger la page suffit généralement.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: T.ember, border: "none", borderRadius: 10,
                padding: "12px 22px", color: "#0C0E14", fontSize: 13.5, fontWeight: 900,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Recharger la page
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{
                background: "none", border: `1.5px solid ${T.line}`, borderRadius: 10,
                padding: "12px 20px", color: T.ink, fontSize: 13.5, fontWeight: 800,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Retour à l'accueil
            </button>
          </div>

          {/* Message technique replié : utile si le visiteur nous le rapporte,
              sans transformer l'écran d'erreur en mur de code. */}
          <details style={{ marginTop: 26, textAlign: "left" }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: T.muted }}>Détail technique</summary>
            <pre
              style={{
                marginTop: 10, padding: 12, borderRadius: 9,
                background: T.surface2, border: `1px solid ${T.line}`,
                color: T.sub, fontSize: 11, lineHeight: 1.55,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
