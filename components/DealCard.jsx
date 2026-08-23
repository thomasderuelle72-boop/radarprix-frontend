// DealCard.jsx — carte "ticket" calquée trait pour trait sur la maquette
// homepage fournie : image à gauche, titre + prix empilés à droite, séparateur
// pointillé, ligne marchand + fraîcheur / score en pied de carte, et une
// bande verticale façon code-barres sur le bord droit avec encoches
// façon coupon (classe .rp-ticket déjà définie dans GlobalStyles).
// Toute la carte est cliquable et ouvre la fiche produit — les cartes-listes
// n'ont aucun bouton inline dans la maquette.
import { T } from "../theme.js";
import { relativeTime, euros, comparaison } from "../utils.js";
import MerchantBadge from "./MerchantBadge.jsx";
import AnimatedPrice from "./AnimatedPrice.jsx";
import Tilt3D from "./Tilt3D.jsx";
import Icon from "./Icon.jsx";

/* ── Squelette de chargement, même gabarit qu'une carte ─────────── */
export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden", padding: "16px 18px" }}
    >
      <div style={{ display: "flex", gap: 14 }}>
        <div className="rp-shimmer" style={{ width: "34%", height: 78, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
          <div className="rp-shimmer" style={{ height: 13, width: "85%", borderRadius: 6 }} />
          <div className="rp-shimmer" style={{ height: 13, width: "55%", borderRadius: 6 }} />
          <div className="rp-shimmer" style={{ height: 20, width: "45%", borderRadius: 6, marginTop: 4 }} />
        </div>
      </div>
      <div className="rp-shimmer" style={{ height: 11, width: "40%", borderRadius: 6, marginTop: 16 }} />
    </div>
  );
}

/**
 * Fin d'offre lisible : « se termine aujourd'hui », « plus que 3 jours »,
 * « jusqu'au 30/09 ».
 *
 * Une date brute ne dit rien à qui la lit vite ; c'est le temps restant
 * qui compte. Au-delà d'une semaine on rend la date, parce qu'« encore
 * 42 jours » n'a plus rien d'une urgence.
 */
function finDeLOffre(iso) {
  if (!iso) return null;
  // SQLite rend « 2026-09-30 00:00:00 » : sans le T, Safari ne sait pas lire.
  const fin = new Date(String(iso).replace(" ", "T"));
  if (Number.isNaN(fin.getTime())) return null;

  const jours = Math.ceil((fin - Date.now()) / 86400000);
  if (jours < 0) return null; // expirée : dealsStore la retire, inutile d'insister
  if (jours === 0) return { libelle: "se termine aujourd'hui", urgent: true };
  if (jours === 1) return { libelle: "dernier jour demain", urgent: true };
  if (jours <= 7) return { libelle: `plus que ${jours} jours`, urgent: true };
  return { libelle: `jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}`, urgent: false };
}

export default function DealCard({ item, onOpenDetail, variant, index }) {
  const resolvedVariant = variant || (item.verdict === "erreur" ? "price-error" : "deal");
  const isErr = resolvedVariant === "price-error";
  const isGem = item.score >= 85;
  const seenAgo = relativeTime(item.scraped_at);
  // Combien de temps il reste, quand le marchand l'annonce. Une offre qui
  // se termine demain ne se lit pas comme une offre permanente, et c'est
  // souvent ce qui décide d'acheter maintenant ou pas.
  const finOffre = finDeLOffre(item.expiresAt);

  // Une « remise » d'un centime n'en est pas une. Vu sur l'accueil :
  // « 299,99 € au lieu de 300,00 € », prix barré à l'appui. Sous 3 %,
  // l'écart relève de l'arrondi ou du prix conseillé recopié : on n'affiche
  // ni le prix barré ni le badge, plutôt que de crier une aubaine inexistante.
  const remiseReelle = item.refPrice > 0 && item.pct >= 3;

  // Le même produit chez d'autres vendeurs, et le fait de savoir si c'est
  // ici qu'il est le moins cher. Sans cette ligne, la même serrure Nuki
  // occupait deux cartes de la page d'accueil.
  const compare = comparaison(item);
  const leMoinsCher = Boolean(compare && compare.avantage);

  // Un score n'a de sens que s'il mesure un écart. Sur une offre sans
  // remise, « 15/100 » occupait un tiers du pied de carte pour ne rien
  // apprendre — pire, il laissait croire à un jugement défavorable alors
  // qu'il n'y avait simplement rien à juger.
  const scoreParlant = item.refSource === "mesure" && (remiseReelle || isErr);
  return (
    <Tilt3D max={7} lift={12} style={{ width: "100%" }}>
    <button
      onClick={() => onOpenDetail && onOpenDetail(item)}
      className="fade-up rp-deal-card rp-ticket"
      style={{
        width: "100%",
        textAlign: "left",
        cursor: onOpenDetail ? "pointer" : "default",
        background: T.surface,
        border: `1.5px solid ${isErr ? T.red : T.line}`,
        boxShadow: isGem ? `0 0 20px ${T.yellow}1f` : isErr ? `0 0 16px ${T.red}14` : "none",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        padding: 0,
        animationDelay: index != null ? `${Math.min(index * 55, 400)}ms` : undefined,
      }}
    >
      {isErr && (
        <svg
          aria-hidden="true"
          width="110"
          height="16"
          viewBox="0 0 110 16"
          style={{ position: "absolute", top: -8, left: "42%" }}
        >
          <polyline
            points="0,8 26,8 33,1 41,15 49,8 110,8"
            fill="none"
            stroke={T.red}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, padding: "16px 16px 13px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {/* Sans image, cette colonne réservait 34% de la carte pour une
                simple icône : on la réduit et on rend la place au titre et
                au prix, qui sont l'information utile. */}
            <div
              style={{
                position: "relative",
                width: item.img ? "34%" : 46,
                minWidth: item.img ? 64 : 46,
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: item.img ? 74 : 46,
                ...(item.img ? {} : { background: T.surface2, borderRadius: 10, alignSelf: "flex-start" }),
              }}
            >
              {!isErr && remiseReelle && (
                <span style={{ position: "absolute", top: -6, left: -6, background: T.purple, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 9px", borderRadius: 7, zIndex: 1 }}>
                  −{item.pct}%
                </span>
              )}
              {item.img ? (
                <img
                  src={item.img}
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  style={{ maxWidth: "100%", maxHeight: 78, objectFit: "contain" }}
                />
              ) : (
                <Icon name="package" size={22} color={T.muted} style={{ opacity: 0.6 }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {isErr && (
                <span className="stamp-badge" style={{ alignSelf: "flex-start", background: "rgba(255,59,48,0.16)", border: `1px solid ${T.red}`, color: T.red, fontFamily: "'Unbounded', system-ui, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "5px 9px", borderRadius: 6 }}>
                  ERREUR
                </span>
              )}
              <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, color: T.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {item.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <AnimatedPrice
                  from={item.refPrice > item.price ? item.refPrice : item.price}
                  to={Number(item.price)}
                  className="rp-display"
                  style={{ fontSize: 19, fontWeight: 900, color: isErr ? T.red : T.emberSolid }}
                />
                {/* Un prix barré n'a pas la même valeur selon son origine :
                    une médiane constatée chez plusieurs vendeurs est un fait,
                    le tarif que le marchand dit pratiquer est un argument.
                    Le site vend la première ; il ne doit pas laisser croire
                    qu'il garantit la seconde. */}
                {remiseReelle && (
                  <span
                    className="rp-hint"
                    tabIndex={0}
                    data-hint={
                      item.refSource === "flux"
                        ? "Prix barré annoncé par le marchand. RadarPrix ne l'a pas vérifié."
                        : "Prix habituel constaté chez les autres vendeurs."
                    }
                    style={{ color: T.sub, textDecoration: "line-through", fontSize: 12.5 }}
                  >
                    {euros(item.refPrice)}
                  </span>
                )}
              </div>
              {compare && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: compare.alerte ? T.yellow : T.green, lineHeight: 1.25 }}>
                  <Icon name={compare.alerte ? "alertTriangle" : "check"} size={11} color={compare.alerte ? T.yellow : T.green} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{compare.libelle}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rp-ticket-sep" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {item.seller && <MerchantBadge name={item.seller} domaine={item.marchandDomaine} size={30} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.seller || "Vendeur inconnu"}
                </div>
                {finOffre ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: finOffre.urgent ? T.yellow : T.sub }}>
                    <Icon name="clock" size={10} color={finOffre.urgent ? T.yellow : T.sub} />
                    {finOffre.libelle}
                  </div>
                ) : seenAgo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: T.sub }}>
                    <span className="rp-fresh-dot" aria-hidden="true" />
                    {seenAgo}
                  </div>
                ) : null}
              </div>
            </div>
            {/* Le score ne s'affiche que si RadarPrix a lui-même mesuré la
                référence. Un article rapporté par un flux n'a souvent aucun
                comparable : afficher « 0/100 » laisserait croire qu'on l'a
                évalué et jugé sans intérêt, alors qu'on ne l'a pas mesuré.
                Et un prix barré venu du marchand ne fonde aucun score : il
                n'est pas une mesure. */}
            {scoreParlant ? (
              <div style={{ textAlign: "right", flexShrink: 0, borderLeft: `1px solid ${T.line}`, paddingLeft: 10 }}>
                <span
                  className="rp-hint rp-hint-end"
                  tabIndex={0}
                  data-hint="Note sur 100 mesurant l'écart entre ce prix et le prix habituel du produit chez les autres vendeurs. Plus il est haut, plus la remise est forte."
                  style={{ display: "inline-block", fontSize: 9.5, color: T.sub, lineHeight: 1.2 }}
                >
                  Score RadarPrix
                </span>
                <div className="rp-display" style={{ fontSize: 13, fontWeight: 800, color: isErr ? T.red : isGem ? T.green : T.ink }}>{item.score}/100</div>
                {item.confidence != null && item.confidence < 60 && (
                  <div style={{ fontSize: 9, color: T.yellow, fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}><Icon name="alertTriangle" size={10} /> à vérifier</div>
                )}
              </div>
            ) : leMoinsCher ? (
              /* Faute de score à montrer, la place sert à dire ce qu'on sait
                 vraiment : c'est ici que ce produit est au prix le plus bas
                 parmi les marchands que RadarPrix suit. */
              <div style={{ textAlign: "right", flexShrink: 0, borderLeft: `1px solid ${T.line}`, paddingLeft: 10, fontSize: 9.5, fontWeight: 800, color: T.green, lineHeight: 1.25 }}>
                Le moins cher<br />
                <span style={{ color: T.sub, fontWeight: 600 }}>sur {compare.total} marchands</span>
              </div>
            ) : null}
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            width: 26,
            flexShrink: 0,
            height: "100%",
            backgroundImage: `repeating-linear-gradient(0deg, ${isErr ? T.red : T.sub} 0 2px, transparent 2px 3px, ${isErr ? T.red : T.sub} 3px 4px, transparent 4px 7px, ${isErr ? T.red : T.sub} 7px 9px, transparent 9px 10px)`,
            opacity: 0.5,
            borderTopRightRadius: 15,
            borderBottomRightRadius: 15,
          }}
        />
      </div>
    </button>

    </Tilt3D>
  );
}
