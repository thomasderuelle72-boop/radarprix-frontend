// panels.jsx — Panneaux réutilisables attachés à un deal : historique de
// prix (graphique Recharts) et fil de commentaires. Utilisés à la fois par
// DealCard (version compacte, dépliable) et par ProductDetailView (version
// pleine page). Extraits de RadarPrixSite.jsx pour éviter la duplication.
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../theme.js";
import { apiGetHistory, apiGetComments, apiPostComment } from "../api.js";
import AuthorLink from "./AuthorLink.jsx";
import { relativeTime } from "../utils.js";

const HISTORY_PERIODS = [
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
];

/* ── Graphique d'historique de prix, avec sélecteur de période et
   statistiques min/max/actuel en un coup d'œil ─────────────────── */
export function PriceHistoryPanel({ query, height = 140 }) {
  const [period, setPeriod] = useState(30);
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    apiGetHistory(query, period)
      .then((d) => !cancelled && setDays(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [query, period]);

  const periodSelector = (
    <div style={{ display: "flex", gap: 4 }}>
      {HISTORY_PERIODS.map((p) => (
        <button
          key={p.days}
          onClick={() => setPeriod(p.days)}
          className="rp-pressable"
          style={{
            padding: "4px 10px",
            borderRadius: 7,
            border: `1px solid ${period === p.days ? T.emberSolid : T.line}`,
            background: period === p.days ? T.ember : "transparent",
            color: period === p.days ? "#0C0E14" : T.sub,
            fontWeight: 800,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  if (error) {
    return (
      <div>
        {periodSelector}
        <p style={{ fontSize: 12, color: T.sub, marginTop: 8 }}>Historique indisponible.</p>
      </div>
    );
  }
  if (!days) {
    return (
      <div>
        {periodSelector}
        <p style={{ fontSize: 12, color: T.sub, marginTop: 8 }}>Chargement…</p>
      </div>
    );
  }
  if (days.length < 2) {
    return (
      <div>
        {periodSelector}
        <p style={{ fontSize: 12, color: T.sub, marginTop: 8 }}>Pas encore assez de données sur cette période — essaie une période plus longue, ou revenez dans quelques jours.</p>
      </div>
    );
  }

  const chartData = days.map((d) => ({ day: d.day.slice(5), prix: Math.round(d.avg_price) }));
  const prices = chartData.map((d) => d.prix);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = prices[prices.length - 1];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {periodSelector}
        <div style={{ display: "flex", gap: 14, fontSize: 11.5 }}>
          <span style={{ color: T.sub }}>Min <strong style={{ color: T.green }}>{minPrice} €</strong></span>
          <span style={{ color: T.sub }}>Max <strong style={{ color: T.ink }}>{maxPrice} €</strong></span>
          <span style={{ color: T.sub }}>Actuel <strong style={{ color: T.emberSolid }}>{currentPrice} €</strong></span>
        </div>
      </div>
      <div style={{ height, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.sub }} axisLine={{ stroke: T.line }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} width={40} domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip contentStyle={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: T.ink }} formatter={(v) => [`${v} €`, "Prix moyen"]} />
            <Line type="monotone" dataKey="prix" stroke={T.emberSolid} strokeWidth={2} dot={{ r: 3, fill: T.emberSolid }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Fil de commentaires d'un deal ─────────────────────────────── */
export function CommentsPanel({ query, authToken, onNeedAuth }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    apiGetComments(query).then(setComments).catch((e) => setError(e.message));
  };
  useEffect(load, [query]);

  const send = async () => {
    if (!authToken) return onNeedAuth();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const items = await apiPostComment(authToken, query, text.trim());
      setComments(items);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ marginTop: 4 }}>
      {!comments && <p style={{ fontSize: 12, color: T.sub }}>Chargement…</p>}
      {comments?.length === 0 && <p style={{ fontSize: 12, color: T.sub }}>Aucun commentaire pour l'instant — sois le premier.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {comments?.map((c) => (
          <div key={c.id} style={{ minWidth: 0 }}>
            <AuthorLink
              userId={c.user_id}
              nom={c.author}
              avatarUrl={c.avatar_url}
              taille={22}
              meta={relativeTime(c.created_at)}
            />
            {/* Aligné sous le pseudo, pas sous la photo : le texte se lit
                comme un bloc et non comme une colonne décalée. */}
            <div style={{ fontSize: 13, color: T.ink, marginTop: 3, paddingLeft: 30, lineHeight: 1.55 }}>{c.body}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={500}
          placeholder={authToken ? "Ajouter un commentaire…" : "Connecte-toi pour commenter"}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${T.line}`, background: T.surface2, color: T.ink, fontSize: 13, fontFamily: "'Inter', sans-serif" }}
        />
        <button
          onClick={send}
          className="rp-pressable"
          disabled={sending}
          style={{ padding: "0 14px", borderRadius: 8, border: "none", background: T.ember, color: "#0C0E14", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          Envoyer
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: T.red, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
