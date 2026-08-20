// PriceChart.jsx — La courbe de prix seule, isolée de son panneau.
//
// Ce fichier existe pour une raison de poids, pas de découpage : `recharts`
// pèse à lui seul l'essentiel du paquet de la fiche produit. Tant que le
// graphique vivait dans panels.jsx, ouvrir une fiche téléchargeait le moteur
// de graphiques complet — y compris pour les visiteurs qui ne déroulaient
// jamais l'historique, c'est-à-dire la plupart.
//
// Isolé ici, `recharts` part dans son propre morceau, que le navigateur ne
// va chercher qu'au moment où la courbe s'affiche réellement (voir le
// React.lazy de panels.jsx).
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../theme.js";

export default function PriceChart({ data, height = 140 }) {
  return (
    <div style={{ height, marginTop: 4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: T.sub }}
            axisLine={{ stroke: T.line }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: T.sub }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={["dataMin - 5", "dataMax + 5"]}
          />
          <Tooltip
            contentStyle={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: T.ink }}
            formatter={(v) => [`${v} €`, "Prix moyen"]}
          />
          <Line type="monotone" dataKey="prix" stroke={T.emberSolid} strokeWidth={2} dot={{ r: 3, fill: T.emberSolid }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
