// InfoView.jsx — Les pages secondaires : À propos, questions fréquentes,
// contact, et les trois pages légales.
//
// Elles vivaient jusqu'ici dans une fenêtre modale unique, qui affichait un
// bloc de texte brut en `white-space: pre-line`. Trois défauts, dans l'ordre
// de gravité :
//
//  1. « Questions fréquentes » et « Nous contacter » figuraient au menu mais
//     n'existaient pas dans la table des textes : les ouvrir plantait la
//     page (lecture d'un objet indéfini).
//  2. Une FAQ dans une modale ne se partage pas, ne s'indexe pas, et se lit
//     mal : c'est le contenu qu'un visiteur consulte AVANT de faire
//     confiance à un site de prix.
//  3. Le reste du site a un traitement graphique (nappes de couleur, cartes
//     en relief, titres travaillés) dont ces pages étaient exclues.
//
// Elles deviennent donc de vraies pages, avec leur adresse, dans le même
// gabarit que les autres vues secondaires.
import { useState } from "react";
import { T } from "../theme.js";
import Icon from "./Icon.jsx";
import PageShell from "./PageShell.jsx";

/* Adresse de contact : une seule occurrence, pour ne pas avoir à la
   corriger à trois endroits le jour où elle change. */
const CONTACT = "contact@radarprix.fr";

/* ── Petits blocs réutilisés par plusieurs pages ─────────────── */

function Paragraphe({ children, style }) {
  return (
    <p style={{ fontSize: 14.5, lineHeight: 1.75, color: T.sub, margin: "0 0 14px", ...style }}>
      {children}
    </p>
  );
}

function Carte({ icone, ton, titre, children }) {
  return (
    <div
      style={{
        background: T.gradSurface,
        border: `1px solid ${T.line}`,
        borderRadius: T.radiusMd,
        padding: "18px 18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38, borderRadius: 11,
          background: `${ton}16`, border: `1px solid ${ton}3a`,
        }}
      >
        <Icon name={icone} size={19} color={ton} />
      </span>
      <h3 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, margin: 0 }}>
        {titre}
      </h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: T.sub, margin: 0 }}>{children}</p>
    </div>
  );
}

/* Titre de section : le même d'une page à l'autre, pour que les pages
   légales et la FAQ se lisent comme un même document. */
function Section({ titre, children, style }) {
  return (
    <section style={{ marginBottom: 30, ...style }}>
      {titre && (
        <h2
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: ".09em",
            textTransform: "uppercase", color: T.muted, margin: "0 0 12px",
          }}
        >
          {titre}
        </h2>
      )}
      {children}
    </section>
  );
}

/* ── À propos ────────────────────────────────────────────────── */

function APropos({ onNaviguer }) {
  return (
    <>
      <Paragraphe style={{ fontSize: 16.5, color: T.ink, lineHeight: 1.7 }}>
        Les vraies bonnes affaires ne sont pas annoncées. Une décimale qui saute, un
        déstockage mal réglé, un prix repris automatiquement d'un fournisseur : ça vit
        vingt minutes, et ça ne fait l'objet d'aucune newsletter.
      </Paragraphe>
      <Paragraphe>
        RadarPrix existe pour ces vingt minutes. Un programme relit en continu des fiches
        produits chez les marchands français, apprend ce que chacune vaut d'habitude, et
        signale celles qui sortent du cadre. Le reste du site — promotions, codes, jeux
        offerts, occasion — vient de flux publics et de ce que les membres remontent.
      </Paragraphe>

      <Section titre="Trois sources, jamais mélangées">
        <div className="rp-info-grille">
          <Carte icone="alertCircle" ton={T.red} titre="Erreurs de prix">
            Une fiche surveillée est relue toutes les quinze minutes. Son prix est comparé à
            sa propre référence — médiane élaguée, écart absolu médian — et non à une moyenne
            du marché. Un écart qui ressemble à une décimale perdue est signalé comme tel.
          </Carte>
          <Carte icone="trendingDown" ton={T.emberSolid} titre="Gros deals">
            Promotions et codes viennent des flux officiels des marchands, pas d'un copier-coller.
            Une remise annoncée n'est publiée que si elle est réelle et suffisante : en dessous
            du seuil, elle reste hors du site.
          </Carte>
          <Carte icone="gem" ton={T.purple} titre="La communauté">
            Ce qu'une machine ne verra jamais — une affiche en magasin, une erreur en caisse,
            un bon plan local — des gens le voient. Leurs trouvailles vivent dans leur propre
            section, distinctes de ce que le radar a trouvé seul.
          </Carte>
        </div>
      </Section>

      <Section titre="Ce que RadarPrix n'est pas">
        <div
          style={{
            border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.yellow}`,
            borderRadius: T.radiusSm, padding: "16px 18px", background: T.surface,
          }}
        >
          <Paragraphe style={{ marginBottom: 10 }}>
            Ni vendeur, ni intermédiaire de vente : RadarPrix n'encaisse rien et ne prend
            aucune commande. Chaque achat se fait chez le marchand, sous ses conditions.
          </Paragraphe>
          <Paragraphe style={{ margin: 0 }}>
            Ni comparateur exhaustif : le site montre ce qu'il a effectivement lu, pas
            l'intégralité d'un marché. Et une offre repérée n'est pas une offre garantie —
            un vendeur peut annuler une commande en cas d'erreur manifeste sur le prix.
          </Paragraphe>
        </div>
      </Section>

      <Section titre="Une promesse vérifiable">
        <Paragraphe>
          Un site qui promet de la fraîcheur devrait pouvoir la prouver. L'état du radar —
          date du dernier balayage, nombre de fiches sous surveillance — est affiché en bas
          du menu, y compris les jours où il est en veille. Mieux vaut un visiteur informé
          qu'un visiteur trompé.
        </Paragraphe>
        <button
          onClick={() => onNaviguer("faq")}
          className="rp-pressable"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: T.surface2, border: `1.5px solid ${T.line}`, borderRadius: 9,
            padding: "10px 16px", color: T.ink, fontSize: 13, fontWeight: 800,
            cursor: "pointer", fontFamily: T.fontBody,
          }}
        >
          Questions fréquentes
          <Icon name="chevronDown" size={14} />
        </button>
      </Section>
    </>
  );
}

/* ── Questions fréquentes ────────────────────────────────────── */

const QUESTIONS = [
  {
    q: "Une « erreur de prix », c'est quoi exactement ?",
    r: `Un prix affiché par erreur par le marchand : une décimale oubliée (129 € au lieu de 1 290 €), une remise cumulée deux fois, un tarif fournisseur publié tel quel. C'est différent d'une promotion, qui est voulue. RadarPrix distingue les deux et ne les range pas au même endroit.`,
  },
  {
    q: "Le marchand est-il obligé d'honorer le prix ?",
    r: `Non. Le droit français permet à un vendeur d'annuler une commande en cas d'erreur manifeste sur le prix — un prix dérisoire au regard de la valeur du bien. Une commande passée sur une erreur peut donc être annulée et remboursée. Il faut le savoir avant de commander, pas après.`,
  },
  {
    q: "À quelle fréquence le radar passe-t-il ?",
    r: `Les fiches sous surveillance sont relues toutes les quinze minutes, les flux de promotions toutes les trente. La découverte de nouvelles fiches est volontairement plus lente : avaler un catalogue entier d'un coup ressemblerait, vu du marchand, à une attaque.`,
  },
  {
    q: "Pourquoi le site affiche-t-il parfois peu d'offres ?",
    r: `Parce qu'on préfère une page courte à une page remplie. Une remise doit dépasser un seuil réel pour être publiée, un prix anormal doit être confirmé par l'historique de la fiche, et les offres expirées sont retirées automatiquement. Un jour creux se voit — c'est le prix de la confiance.`,
  },
  {
    q: "Comment être prévenu quand quelque chose tombe ?",
    r: `En suivant un produit depuis sa fiche. Vous recevez un email dès qu'une anomalie de prix est repérée dessus, ou dès qu'il passe sous le prix que vous avez fixé. Les réponses, abonnements et messages se retrouvent dans la section Activité.`,
  },
  {
    q: "RadarPrix gagne-t-il de l'argent sur mes achats ?",
    r: `Certains liens vers les marchands sont des liens d'affiliation : si un achat suit, le site touche une commission, sans surcoût pour vous. Cela n'influence pas le classement — un deal est publié parce qu'il passe les seuils, pas parce qu'il rapporte.`,
  },
  {
    q: "Puis-je proposer un deal moi-même ?",
    r: `Oui, depuis la section Communauté. Les trouvailles des membres restent affichées séparément de ce que le radar a détecté : les deux n'ont ni la même origine ni le même mode de vérification, et les confondre rendrait la distinction invisible.`,
  },
  {
    q: "Comment supprimer mon compte et mes données ?",
    r: `Depuis Paramètres → Sécurité, la suppression du compte efface le compte et les données associées. Vos messages publics dans le forum peuvent rester, sans lien avec votre identité. Pour toute demande particulière : ${CONTACT}.`,
  },
];

function Faq() {
  // Un seul volet ouvert à la fois : ouvrir une réponse referme la
  // précédente, sinon la page s'allonge sans qu'on sache où on en est.
  const [ouvert, setOuvert] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {QUESTIONS.map((item, i) => {
        const actif = ouvert === i;
        return (
          <div
            key={item.q}
            style={{
              border: `1px solid ${actif ? T.lineSoft : T.line}`,
              borderRadius: T.radiusSm,
              background: actif ? T.surface : "transparent",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOuvert(actif ? -1 : i)}
              aria-expanded={actif}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                textAlign: "left", background: "none", border: "none",
                padding: "15px 16px", cursor: "pointer", color: T.ink,
                fontSize: 14.5, fontWeight: 700, fontFamily: T.fontBody,
              }}
            >
              <span style={{ flex: 1 }}>{item.q}</span>
              <span
                aria-hidden="true"
                style={{
                  display: "flex", flexShrink: 0, color: actif ? T.emberSolid : T.muted,
                  transform: actif ? "rotate(180deg)" : "none",
                  transition: "transform .18s ease",
                }}
              >
                <Icon name="chevronDown" size={16} />
              </span>
            </button>
            {actif && (
              <p style={{ margin: 0, padding: "0 16px 16px", fontSize: 14, lineHeight: 1.75, color: T.sub }}>
                {item.r}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Contact ─────────────────────────────────────────────────── */

function Contact({ onNaviguer }) {
  return (
    <>
      <Paragraphe>
        Une offre qui n'aurait pas dû être publiée, un prix faux, une fiche mal lue :
        ces signalements sont les plus utiles, parce qu'ils corrigent l'algorithme et
        pas seulement la page.
      </Paragraphe>

      <a
        href={`mailto:${CONTACT}`}
        className="rp-pressable"
        style={{
          display: "flex", alignItems: "center", gap: 14, textDecoration: "none",
          background: T.gradSurface, border: `1px solid ${T.line}`,
          borderRadius: T.radiusMd, padding: "16px 18px", marginBottom: 10,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: `${T.emberSolid}16`, border: `1px solid ${T.emberSolid}3a`,
          }}
        >
          <Icon name="mail" size={19} color={T.emberSolid} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: T.ink }}>
            {CONTACT}
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: T.sub, marginTop: 2 }}>
            Signalement, presse, partenariat, demande RGPD
          </span>
        </span>
      </a>

      <button
        onClick={() => onNaviguer("communaute-forum")}
        className="rp-pressable"
        style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
          background: T.gradSurface, border: `1px solid ${T.line}`,
          borderRadius: T.radiusMd, padding: "16px 18px", cursor: "pointer",
          fontFamily: T.fontBody,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: `${T.cyan}16`, border: `1px solid ${T.cyan}3a`,
          }}
        >
          <Icon name="message" size={19} color={T.cyan} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: T.ink }}>
            Forum
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: T.sub, marginTop: 2 }}>
            Pour une question qui peut servir à d'autres — la réponse y reste visible
          </span>
        </span>
      </button>

      <Paragraphe style={{ marginTop: 22, fontSize: 13, color: T.muted }}>
        Réponse sous quelques jours. Un signalement sur une offre précise est plus rapide
        depuis la fiche elle-même : le bouton de signalement joint automatiquement l'offre
        concernée.
      </Paragraphe>
    </>
  );
}

/* ── Pages légales ───────────────────────────────────────────── */
/* Le texte est découpé en articles au lieu d'un bloc unique : une clause
   qu'on ne peut pas citer par son numéro n'a pas de valeur d'usage. */

const LEGAL = {
  mentions: {
    titre: "Mentions légales",
    sousTitre: "Qui édite ce site, et qui l'héberge.",
    icone: "shield",
    ton: T.steel,
    articles: [
      {
        titre: "Éditeur",
        texte: `Éditeur du site : [nom ou raison sociale à compléter]
Statut : [auto-entrepreneur, SAS…] — SIREN : [à compléter]
Adresse : [à compléter]
Directeur de la publication : [à compléter]
Contact : ${CONTACT}`,
      },
      {
        titre: "Hébergement",
        texte: `Interface web : Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
Serveur applicatif et base de données : Railway Corp., États-Unis.`,
      },
      {
        titre: "Nature du service",
        texte: `RadarPrix est un service d'information sur les prix. Les offres présentées proviennent d'une lecture automatisée de pages marchandes publiques et de flux fournis par les marchands ou leurs plateformes d'affiliation. RadarPrix n'est ni vendeur, ni intermédiaire de vente, et n'est affilié à aucune des enseignes citées.`,
      },
      {
        titre: "Propriété intellectuelle",
        texte: `Les marques, logos et visuels produits appartiennent à leurs détenteurs respectifs et ne sont reproduits qu'à des fins d'identification des offres.`,
      },
    ],
  },
  cgu: {
    titre: "Conditions générales d'utilisation",
    sousTitre: "Ce que le service promet, et ce qu'il ne promet pas.",
    icone: "scale",
    ton: T.steel,
    articles: [
      {
        titre: "1. Objet",
        texte: `RadarPrix détecte des variations de prix inhabituelles sur des sites marchands tiers, collecte des promotions et codes issus de flux publics, et présente le tout à titre purement informatif.`,
      },
      {
        titre: "2. Absence de garantie",
        texte: `Les prix, remises et disponibilités sont ceux relevés au moment du balayage et peuvent changer à tout instant. RadarPrix ne garantit ni leur exactitude, ni leur maintien par le vendeur. Un vendeur peut, en droit français, annuler une commande en cas d'erreur manifeste sur le prix.`,
      },
      {
        titre: "3. Responsabilité",
        texte: `L'utilisateur reste seul responsable de ses achats. Vérifiez systématiquement l'offre, le vendeur et les conditions de vente sur le site marchand avant tout paiement.`,
      },
      {
        titre: "4. Compte et contributions",
        texte: `La création d'un compte donne accès aux favoris, aux alertes et aux espaces communautaires. Les contributions publiées (deals, sujets, messages) doivent être exactes et respectueuses ; les contenus trompeurs, promotionnels ou illicites sont retirés, et le compte peut être suspendu.`,
      },
      {
        titre: "5. Liens d'affiliation",
        texte: `Certains liens vers les marchands sont des liens d'affiliation : un achat effectué à leur suite peut donner lieu à une commission, sans surcoût pour l'utilisateur. Cette rémunération n'entre pas dans le calcul du classement des offres.`,
      },
      {
        titre: "6. Usage du service",
        texte: `Le service est fourni « en l'état », pour un usage personnel et raisonnable. L'extraction automatisée massive du contenu du site n'est pas autorisée.`,
      },
    ],
  },
  confidentialite: {
    titre: "Politique de confidentialité",
    sousTitre: "Les données conservées, et pourquoi.",
    icone: "lock",
    ton: T.steel,
    articles: [
      {
        titre: "Données de compte",
        texte: `Créer un compte enregistre une adresse email, un mot de passe (conservé sous forme de condensat bcrypt, jamais en clair), un pseudo et, si vous en choisissez un, un avatar. L'email sert à la connexion, aux alertes que vous demandez et, le cas échéant, à la réinitialisation du mot de passe.`,
      },
      {
        titre: "Données d'usage",
        texte: `Les produits que vous suivez, vos prix cibles, vos favoris et vos contributions sont conservés tant que le compte existe. La session est maintenue par un jeton stocké dans votre navigateur — pas par un cookie de suivi.`,
      },
      {
        titre: "Aucune publicité ciblée",
        texte: `RadarPrix ne dépose pas de cookie publicitaire, ne revend aucune donnée et n'utilise pas de régie de ciblage. Les liens d'affiliation transmettent au marchand la seule information qu'un clic vient de RadarPrix.`,
      },
      {
        titre: "Historique des prix",
        texte: `Les prix relevés sur les fiches marchandes sont conservés pour établir une référence par produit — c'est ce qui permet de reconnaître un prix anormal. Cet historique porte sur des produits, pas sur des personnes, et n'est associé à aucun compte.`,
      },
      {
        titre: "Vos droits",
        texte: `Vous pouvez consulter et modifier vos informations depuis Paramètres, et supprimer votre compte depuis l'onglet Sécurité — la suppression est immédiate et définitive. Pour toute demande d'accès, de rectification ou d'effacement : ${CONTACT}.`,
      },
      {
        titre: "À relire",
        texte: `[Ce texte décrit fidèlement le fonctionnement actuel du site, mais doit être relu par un professionnel avant exploitation commerciale — RGPD.]`,
      },
    ],
  },
};

function PageLegale({ contenu }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {contenu.articles.map((a) => (
        <section key={a.titre}>
          <h2 className="rp-display" style={{ fontSize: 15, fontWeight: 900, color: T.ink, margin: "0 0 8px" }}>
            {a.titre}
          </h2>
          <p style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.75, color: T.sub, margin: 0 }}>
            {a.texte}
          </p>
        </section>
      ))}
      <p style={{ fontSize: 12, color: T.muted, borderTop: `1px solid ${T.line}`, paddingTop: 14, margin: 0 }}>
        Dernière mise à jour : août 2026.
      </p>
    </div>
  );
}

/* ── Aiguillage ──────────────────────────────────────────────── */

const ENTETES = {
  "a-propos": {
    titre: "À propos",
    sousTitre: "Ce que RadarPrix cherche, et comment il le trouve.",
    icone: "radar",
    ton: T.emberSolid,
  },
  faq: {
    titre: "Questions fréquentes",
    sousTitre: "Ce qu'on nous demande le plus souvent, répondu sans détour.",
    icone: "alertCircle",
    ton: T.cyan,
  },
  contact: {
    titre: "Nous contacter",
    sousTitre: "Un signalement, une question, une proposition.",
    icone: "mail",
    ton: T.purple,
  },
};

export default function InfoView({ page, onBack, onNaviguer }) {
  const legal = LEGAL[page];
  const entete = legal
    ? { titre: legal.titre, sousTitre: legal.sousTitre, icone: legal.icone, ton: legal.ton }
    : ENTETES[page] || ENTETES["a-propos"];

  return (
    <PageShell
      icon={entete.icone}
      iconColor={entete.ton}
      title={entete.titre}
      subtitle={entete.sousTitre}
      onBack={onBack}
      width={780}
    >
      {legal ? (
        <PageLegale contenu={legal} />
      ) : page === "faq" ? (
        <Faq />
      ) : page === "contact" ? (
        <Contact onNaviguer={onNaviguer} />
      ) : (
        <APropos onNaviguer={onNaviguer} />
      )}
    </PageShell>
  );
}
