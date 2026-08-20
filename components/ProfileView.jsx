// ProfileView.jsx — Profil public d'un membre.
//
// Jusqu'ici un membre n'existait sur le site que comme un pseudo et une
// pastille de couleur en marge d'un commentaire. Impossible de savoir qui
// avait posté un deal, depuis combien de temps il était là, si ses
// trouvailles précédentes s'étaient révélées bonnes — donc impossible de
// décider s'il fallait lui faire confiance. C'est pourtant la question
// qu'on se pose avant de cliquer sur "Voir l'offre".
//
// Tout ce qui est affiché ici est compté en base à la lecture : aucun
// chiffre n'est arrondi vers le haut, aucun badge n'est décoratif. Un profil
// vide reste vide — et affiche à la place ce qu'il reste à faire pour
// obtenir son premier badge.
import { useState, useEffect, useCallback } from "react";
import { T } from "../theme.js";
import {
  apiMemberProfile, apiMemberActivity, apiMemberDeals, apiMemberThreads, apiFollowMember,
} from "../api.js";
import PageShell, { EmptyState } from "./PageShell.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import Tilt3D from "./Tilt3D.jsx";
import BadgeHex, { couleurNiveau } from "./BadgeHex.jsx";
import CommunityDealCard from "./CommunityDealCard.jsx";
import { anciennete, dateLongue, relativeTime, nombreLisible } from "../utils.js";

const ONGLETS = [
  { id: "activite", label: "Activité", icon: "clock" },
  { id: "deals", label: "Deals", icon: "package" },
  { id: "discussions", label: "Discussions", icon: "message" },
  { id: "badges", label: "Badges", icon: "trophy" },
  { id: "statistiques", label: "Statistiques", icon: "scale" },
];

/**
 * Un compteur de l'en-tête : "2 117 deals", "1 commentaire".
 * `libelle` est donné au singulier ; le "s" est ajouté au-delà de 1.
 */
function Compteur({ valeur, libelle, pluriel }) {
  return (
    <span style={{ fontSize: 13, color: T.sub }}>
      <strong className="rp-display" style={{ color: T.ink, fontWeight: 900 }}>{nombreLisible(valeur)}</strong>{" "}
      {valeur > 1 ? pluriel || `${libelle}s` : libelle}
    </span>
  );
}

/** Une distinction obtenue : hexagone gravé, intitulé, date réelle. */
function Badge({ badge, compact = false }) {
  const pastille = (
    <BadgeHex
      icone={badge.icone}
      niveau={badge.niveau}
      taille={compact ? 34 : 56}
      titre={`${badge.nom} — niveau ${badge.niveau}`}
    />
  );

  if (compact) return <span title={`${badge.nom} — niveau ${badge.niveau}`}>{pastille}</span>;

  return (
    <div
      className="fade-up"
      style={{
        display: "flex", gap: 16, alignItems: "flex-start",
        background: T.gradSurface, border: `1px solid ${T.line}`,
        borderRadius: T.radiusLg, padding: "16px 18px",
      }}
    >
      {pastille}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h4 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>
            {badge.nom}{" "}
            <span style={{ color: couleurNiveau(badge.niveau) }}>— niveau {badge.niveau}</span>
          </h4>
          <span style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>{dateLongue(badge.obtenuLe)}</span>
        </div>
        <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.55, marginTop: 5 }}>{badge.description}</p>
      </div>
    </div>
  );
}

/** Bloc de statistiques : un grand chiffre à gauche, le détail à droite. */
function BlocStats({ titre, principal, libellePrincipal, details }) {
  return (
    <Tilt3D max={7} lift={9}>
      <div
        className="rp-gradient-border"
        style={{
          background: T.gradSurface, border: `1px solid ${T.line}`,
          borderRadius: T.radiusLg, padding: "20px 22px", boxShadow: T.shadowCard, height: "100%",
        }}
      >
        <h4 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, marginBottom: 16 }}>{titre}</h4>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ transform: "translateZ(20px)" }}>
            <div className="rp-display" style={{ fontSize: 34, fontWeight: 900, color: T.ink, lineHeight: 1 }}>
              {nombreLisible(principal)}
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 5 }}>{libellePrincipal}</div>
          </div>
          {details.length > 0 && (
            <div
              style={{
                display: "flex", gap: 22, flexWrap: "wrap", flex: 1,
                borderLeft: `1px solid ${T.line}`, paddingLeft: 22, minWidth: 160,
              }}
            >
              {details.map((d) => (
                <div key={d.libelle}>
                  <div
                    className="rp-display"
                    style={{ fontSize: 19, fontWeight: 900, color: d.couleur || T.ink, lineHeight: 1.1 }}
                  >
                    {d.valeur}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.sub, marginTop: 3 }}>
                    {d.icone && <Icon name={d.icone} size={12} color={d.couleur || T.sub} />}
                    {d.libelle}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Tilt3D>
  );
}

/** Libellés du fil d'activité — un membre doit comprendre chaque ligne sans contexte. */
const ACTIVITE = {
  deal: { verbe: "a partagé un deal", icone: "package", couleur: T.emberSolid },
  comment: { verbe: "a commenté", icone: "message", couleur: T.cyan },
  thread: { verbe: "a ouvert une discussion", icone: "users", couleur: T.purple },
  reply: { verbe: "a répondu dans", icone: "message", couleur: T.green },
};

export default function ProfileView({ handle, authToken, currentUser, onBack, onNeedAuth, onOpenThread, onMessage }) {
  const [data, setData] = useState(undefined); // undefined = chargement, null = introuvable
  const [erreur, setErreur] = useState(null);
  const [onglet, setOnglet] = useState("activite");
  const [contenu, setContenu] = useState({});   // { activite: [...], deals: [...], discussions: [...] }
  const [suitEnCours, setSuitEnCours] = useState(false);

  // Profil : rechargé dès qu'on change de membre.
  useEffect(() => {
    let annule = false;
    setData(undefined);
    setContenu({});
    setOnglet("activite");
    setErreur(null);
    apiMemberProfile(handle, authToken)
      .then((d) => !annule && setData(d))
      .catch((e) => { if (!annule) { setData(null); setErreur(e.message); } });
    return () => { annule = true; };
  }, [handle, authToken]);

  // Contenu de l'onglet : chargé seulement à l'ouverture, et une seule fois.
  // Un profil affiche cinq sections ; toutes les charger d'emblée ferait
  // quatre appels réseau pour rien.
  const chargerOnglet = useCallback(async (id) => {
    if (!data?.membre || contenu[id] !== undefined) return;
    const chargeurs = {
      activite: () => apiMemberActivity(handle),
      deals: () => apiMemberDeals(handle, authToken),
      discussions: () => apiMemberThreads(handle),
    };
    if (!chargeurs[id]) return; // badges et statistiques sont déjà dans `data`
    setContenu((p) => ({ ...p, [id]: null })); // null = en cours
    try {
      const resultat = await chargeurs[id]();
      setContenu((p) => ({ ...p, [id]: resultat }));
    } catch {
      setContenu((p) => ({ ...p, [id]: [] }));
    }
  }, [data, contenu, handle, authToken]);

  useEffect(() => { chargerOnglet(onglet); }, [onglet, chargerOnglet]);

  const basculerAbonnement = async () => {
    if (!authToken) return onNeedAuth?.();
    setSuitEnCours(true);
    try {
      const r = await apiFollowMember(authToken, handle, !data.jeLeSuis);
      setData((p) => ({ ...p, jeLeSuis: r.jeLeSuis, stats: { ...p.stats, abonnes: r.abonnes } }));
    } catch (e) {
      setErreur(e.message);
    } finally {
      setSuitEnCours(false);
    }
  };

  if (data === undefined) {
    return (
      <PageShell icon="user" title="Profil" onBack={onBack}>
        <div className="rp-shimmer" style={{ height: 190, borderRadius: T.radiusLg, marginBottom: 16 }} />
        <div className="rp-shimmer" style={{ height: 320, borderRadius: T.radiusLg }} />
      </PageShell>
    );
  }

  if (data === null) {
    return (
      <PageShell icon="user" title="Profil introuvable" onBack={onBack}>
        <EmptyState
          icon="user"
          tone={T.red}
          title="Ce membre n'existe pas"
          text={erreur || "Le pseudo demandé ne correspond à aucun compte. Il a peut-être été changé, ou le compte supprimé."}
        />
      </PageShell>
    );
  }

  const { membre, stats, badges, prochainsBadges, jeLeSuis, cestMoi } = data;
  const items = contenu[onglet];

  // Un membre conserve chaque échelon franchi, et l'onglet Badges les liste
  // tous avec leur date. Mais dans la rangée de résumé sous la photo, montrer
  // Chasseur niveaux 1, 2 et 3 occuperait trois emplacements sur six pour
  // une seule distinction : on n'y garde que le plus haut de chaque famille.
  const resume = Object.values(
    badges.reduce((acc, b) => {
      if (!acc[b.famille] || b.niveau > acc[b.famille].niveau) acc[b.famille] = b;
      return acc;
    }, {})
  ).sort((a, b) => b.niveau - a.niveau);

  return (
    <PageShell onBack={onBack} width={1000} iconColor={T.purple}>
      {/* ── En-tête : qui est ce membre ───────────────────────── */}
      <div
        className="fade-up"
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10,
          background: T.gradSurface, border: `1px solid ${T.line}`, borderRadius: T.radiusXl,
          padding: "26px 22px 24px", boxShadow: T.shadowCard, marginTop: -8, marginBottom: 22,
        }}
      >
        <div style={{ borderRadius: "50%", padding: 3, background: T.ember }}>
          <div style={{ borderRadius: "50%", padding: 3, background: T.bg }}>
            <Avatar email={membre.displayName} avatarUrl={membre.avatarUrl} size={92} />
          </div>
        </div>

        <h2 className="rp-display" style={{ fontSize: "clamp(21px, 3vw, 28px)", fontWeight: 900, letterSpacing: "-0.01em" }}>
          {membre.displayName}
          {membre.isAdmin && (
            <span
              style={{
                marginLeft: 10, verticalAlign: "middle", fontSize: 10.5, fontWeight: 900,
                padding: "3px 9px", borderRadius: 999, letterSpacing: ".04em",
                background: `${T.emberSolid}1c`, border: `1px solid ${T.emberSolid}55`, color: T.emberLight,
              }}
            >
              ÉQUIPE
            </span>
          )}
        </h2>

        <div style={{ fontSize: 13, color: T.sub }}>Membre {anciennete(membre.createdAt)}</div>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", marginTop: 2 }}>
          <Compteur valeur={stats.deals.publies} libelle="deal" />
          <Compteur valeur={stats.commentaires} libelle="commentaire" />
          <Compteur valeur={stats.abonnes} libelle="abonné" />
        </div>

        {resume.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
            {resume.slice(0, 6).map((b) => <Badge key={b.cle} badge={b} compact />)}
            {resume.length > 6 && (
              <button
                onClick={() => setOnglet("badges")}
                style={{ background: "none", border: "none", color: T.sub, fontSize: 16, cursor: "pointer", padding: "0 4px" }}
                title="Voir tous les badges"
              >
                …
              </button>
            )}
          </div>
        )}

        {/* Actions : rien pour soi-même — on ne s'abonne pas à soi et on ne
            s'écrit pas de message privé. */}
        {!cestMoi && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
            <button
              onClick={basculerAbonnement}
              disabled={suitEnCours}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                borderRadius: 10, fontWeight: 900, fontSize: 13, cursor: suitEnCours ? "wait" : "pointer",
                fontFamily: "'Inter', sans-serif",
                background: jeLeSuis ? "transparent" : T.ember,
                color: jeLeSuis ? T.ink : "#0C0E14",
                border: jeLeSuis ? `1.5px solid ${T.line}` : "none",
              }}
            >
              <Icon name={jeLeSuis ? "check" : "users"} size={15} />
              {jeLeSuis ? "Abonné" : "Suivre"}
            </button>
            {onMessage && (
              <button
                onClick={() => (authToken ? onMessage(membre.id) : onNeedAuth?.())}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                  borderRadius: 10, fontWeight: 900, fontSize: 13, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  background: "transparent", color: T.ink, border: `1.5px solid ${T.line}`,
                }}
              >
                <Icon name="mail" size={15} />
                Envoyer un message
              </button>
            )}
          </div>
        )}
        {cestMoi && (
          <p style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>
            C'est votre profil, tel que les autres membres le voient.
          </p>
        )}
      </div>

      {erreur && data && <p style={{ color: T.red, fontSize: 12.5, marginBottom: 12 }}>{erreur}</p>}

      {/* ── Onglets ───────────────────────────────────────────── */}
      <div
        className="rp-scroll-x"
        style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.line}`, marginBottom: 22, overflowX: "auto" }}
      >
        {ONGLETS.map((o) => {
          const actif = onglet === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "11px 15px",
                background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: actif ? 900 : 700,
                color: actif ? T.ink : T.sub,
                borderBottom: `2px solid ${actif ? T.emberSolid : "transparent"}`,
                marginBottom: -1,
              }}
            >
              <Icon name={o.icon} size={15} color={actif ? T.emberSolid : T.muted} />
              {o.label}
            </button>
          );
        })}
      </div>

      {/* ── Activité ──────────────────────────────────────────── */}
      {onglet === "activite" && (
        items === null || items === undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map((i) => <div key={i} className="rp-shimmer" style={{ height: 68, borderRadius: 13 }} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="clock"
            tone={T.purple}
            title="Rien de publié pour l'instant"
            text={cestMoi
              ? "Partagez un deal, commentez une trouvaille ou lancez une discussion : votre activité apparaîtra ici."
              : `${membre.displayName} n'a encore rien publié sur le site.`}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((a, i) => {
              const meta = ACTIVITE[a.type] || ACTIVITE.comment;
              const cliquable = (a.type === "thread" || a.type === "reply") && onOpenThread;
              return (
                <div
                  key={`${a.type}-${a.ref}-${i}`}
                  className="fade-up"
                  onClick={cliquable ? () => onOpenThread(a.ref) : undefined}
                  style={{
                    display: "flex", gap: 13, alignItems: "flex-start",
                    background: T.gradSurface, border: `1px solid ${T.line}`,
                    borderRadius: T.radiusMd, padding: "13px 16px",
                    animationDelay: `${Math.min(i, 8) * 45}ms`,
                    cursor: cliquable ? "pointer" : "default",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: `${meta.couleur}16`, border: `1px solid ${meta.couleur}3a`,
                    }}
                  >
                    <Icon name={meta.icone} size={15} color={meta.couleur} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: T.sub }}>
                      {meta.verbe} · {relativeTime(a.created_at)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginTop: 2 }}>{a.titre}</div>
                    {a.extrait && (
                      <p style={{ fontSize: 12.5, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>
                        {a.extrait}
                        {a.extrait.length >= 180 ? "…" : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Deals ─────────────────────────────────────────────── */}
      {onglet === "deals" && (
        items === null || items === undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1].map((i) => <div key={i} className="rp-shimmer" style={{ height: 118, borderRadius: 14 }} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="package"
            tone={T.emberSolid}
            title="Aucun deal partagé"
            text={cestMoi
              ? "Vous n'avez encore proposé aucune trouvaille à la communauté."
              : `${membre.displayName} n'a encore partagé aucun deal.`}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((d, i) => <CommunityDealCard key={d.id} deal={d} index={i} showAuthor={false} />)}
          </div>
        )
      )}

      {/* ── Discussions ───────────────────────────────────────── */}
      {onglet === "discussions" && (
        items === null || items === undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1].map((i) => <div key={i} className="rp-shimmer" style={{ height: 62, borderRadius: 13 }} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="message"
            tone={T.cyan}
            title="Aucune discussion ouverte"
            text={cestMoi
              ? "Une question, un doute sur une offre ? Ouvrez un sujet sur le forum."
              : `${membre.displayName} n'a encore ouvert aucun sujet sur le forum.`}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((t, i) => (
              <button
                key={t.id}
                onClick={() => onOpenThread?.(t.id)}
                className="fade-up"
                style={{
                  display: "flex", alignItems: "center", gap: 13, textAlign: "left", width: "100%",
                  background: T.gradSurface, border: `1px solid ${T.line}`, borderRadius: T.radiusMd,
                  padding: "13px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  animationDelay: `${Math.min(i, 8) * 45}ms`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: `${T.purple}16`, border: `1px solid ${T.purple}3a`,
                  }}
                >
                  <Icon name="folder" size={15} color={T.purple} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
                    {t.category_name} · {t.reply_count} réponse{t.reply_count > 1 ? "s" : ""} · {relativeTime(t.created_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* ── Badges ────────────────────────────────────────────── */}
      {onglet === "badges" && (
        <>
          {badges.length === 0 ? (
            <EmptyState
              icon="trophy"
              tone={T.yellow}
              title="Pas encore de badge"
              text={cestMoi
                ? "Les badges s'obtiennent en participant : partager un deal, voter, commenter, lancer une discussion. Voici par quoi commencer."
                : `${membre.displayName} n'a pas encore obtenu de distinction.`}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {badges.map((b) => <Badge key={b.cle} badge={b} />)}
            </div>
          )}

          {/* Le prochain palier — ce qui manque pour l'atteindre. Sans ça, un
              nouveau membre voit une page vide sans savoir quoi en faire. */}
          {prochainsBadges?.length > 0 && (
            <>
              <h3 className="rp-display" style={{ fontSize: 15, fontWeight: 900, margin: "28px 0 14px" }}>
                {cestMoi ? "Vos prochains badges" : "Prochains badges"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {prochainsBadges.slice(0, 4).map((p) => {
                  const part = Math.min(100, Math.round((p.actuel / p.objectif) * 100));
                  return (
                    <div
                      key={p.famille}
                      style={{
                        background: T.surface2, border: `1px dashed ${T.line}`,
                        borderRadius: T.radiusMd, padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ opacity: 0.4, filter: "grayscale(1)" }}>
                          <BadgeHex icone={p.icone} niveau={p.niveau} taille={30} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: T.sub }}>
                          {p.nom} — niveau {p.niveau}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: T.surface3, overflow: "hidden" }}>
                        <div style={{ width: `${part}%`, height: "100%", background: T.ember, borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 7 }}>
                        {p.actuel} / {p.objectif}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Statistiques ──────────────────────────────────────── */}
      {onglet === "statistiques" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <BlocStats
            titre="Deals"
            principal={stats.deals.publies}
            libellePrincipal={stats.deals.publies > 1 ? "deals partagés" : "deal partagé"}
            details={[
              {
                valeur: stats.deals.partValides === null ? "—" : `${stats.deals.partValides} %`,
                libelle: "validés par la communauté",
                icone: "flame",
                couleur: T.emberSolid,
              },
              { valeur: nombreLisible(stats.deals.votesRecus), libelle: "votes positifs reçus", icone: "chevronUp", couleur: T.green },
              { valeur: `+${stats.deals.meilleurScore}`, libelle: "meilleur score", icone: "trendingDown", couleur: T.yellow },
            ]}
          />
          <BlocStats
            titre="Commentaires"
            principal={stats.commentaires}
            libellePrincipal={stats.commentaires > 1 ? "commentaires postés" : "commentaire posté"}
            details={[
              { valeur: nombreLisible(stats.forum.reponses), libelle: "réponses sur le forum", icone: "message", couleur: T.cyan },
            ]}
          />
          <BlocStats
            titre="Communauté"
            principal={stats.abonnes}
            libellePrincipal={stats.abonnes > 1 ? "abonnés" : "abonné"}
            details={[
              {
                valeur: nombreLisible(stats.abonnements),
                libelle: stats.abonnements > 1 ? "abonnements" : "abonnement",
                icone: "users", couleur: T.purple,
              },
              {
                valeur: nombreLisible(stats.forum.sujets),
                libelle: stats.forum.sujets > 1 ? "discussions ouvertes" : "discussion ouverte",
                icone: "folder", couleur: T.purple,
              },
            ]}
          />
          <BlocStats
            titre="Votes"
            principal={stats.votes.emis}
            libellePrincipal={stats.votes.emis > 1 ? "votes exprimés" : "vote exprimé"}
            details={
              stats.votes.categorieFavorite
                ? [{ valeur: stats.votes.categorieFavorite, libelle: "catégorie la plus votée", icone: "star", couleur: T.yellow }]
                : []
            }
          />
        </div>
      )}
    </PageShell>
  );
}
