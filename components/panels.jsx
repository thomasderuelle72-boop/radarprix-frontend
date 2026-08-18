// panels.jsx — Panneaux réutilisables attachés à un deal : historique de
// prix (graphique Recharts) et fil de commentaires. Utilisés à la fois par
// DealCard (version compacte, dépliable) et par ProductDetailView (version
// pleine page). Extraits de RadarPrixSite.jsx pour éviter la duplication.
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../theme.js";
import { apiGetHistory, apiGetComments, apiPostComment } from "../api.js";
import Avatar from "./Avatar.jsx";

/* ── Mini-graphique d'historique de prix ──────────────────────── */
export function PriceHistoryPanel({ query, height = 140 }) {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiGetHistory(query)
      .then((d) => !cancelled && setDays(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [query]);

  if (error) return <p style={{ fontSize: 12, color: T.sub }}>Historique indisponible.</p>;
  if (!days) return <p style={{ fontSize: 12, color: T.sub }}>Chargement…</p>;
  if (days.length < 2) return <p style={{ fontSize: 12, color: T.sub }}>Pas encore assez de données pour un graphique — revenez dans quelques jours.</p>;

  const chartData = days.map((d) => ({ day: d.day.slice(5), prix: Math.round(d.avg_price) }));
  return (
    <div style={{ height, marginTop: 4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.sub }} axisLine={{ stroke: T.line }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: T.ink }} formatter={(v) => [`${v} €`, "Prix moyen"]} />
          <Line type="monotone" dataKey="prix" stroke={T.emberSolid} strokeWidth={2} dot={{ r: 3, fill: T.emberSolid }} />
        </LineChart>
      </ResponsiveContainer>
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
          <div key={c.id} style={{ display: "flex", gap: 8 }}>
            <Avatar email={c.author} avatarUrl={c.avatar_url} size={22} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12 }}>
                <strong style={{ color: T.ink }}>{c.author}</strong>{" "}
                <span style={{ color: T.sub, fontSize: 10.5 }}>{c.created_at?.slice(0, 16).replace("T", " ")}</span>
              </div>
              <div style={{ fontSize: 13, color: T.ink }}>{c.body}</div>
            </div>
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
